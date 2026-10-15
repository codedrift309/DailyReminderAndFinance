using System.Net;
using System.Text.Json;
using FinanceApi.Data;
using FinanceApi.Models;
using Microsoft.EntityFrameworkCore;
using WebPush;

namespace FinanceApi.Services;

public class WebPushReminderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WebPushReminderService> _logger;

    public WebPushReminderService(IServiceScopeFactory scopeFactory, IConfiguration configuration, ILogger<WebPushReminderService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var publicKey = _configuration["WebPush:PublicKey"];
        var privateKey = _configuration["WebPush:PrivateKey"];
        if (string.IsNullOrWhiteSpace(publicKey) || string.IsNullOrWhiteSpace(privateKey))
        {
            _logger.LogWarning("Web push scheduler is disabled until WebPush:PublicKey and WebPush:PrivateKey are configured.");
            return;
        }

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await SendDueAsync(publicKey, privateKey, stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { _logger.LogError(ex, "Web push reminder scheduler failed."); }

            try { await timer.WaitForNextTickAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
        }
    }

    private async Task SendDueAsync(string publicKey, string privateKey, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = ReminderClock.Now;
        var due = await db.PushReminders
            .Include(x => x.Device)
            .Where(x => x.IsEnabled && x.NextOccurrence <= now &&
                (x.LastSentForOccurrence == null || x.LastSentForOccurrence != x.NextOccurrence))
            .ToListAsync(ct);
        if (due.Count == 0) return;

        var client = new WebPushClient();
        var vapid = new VapidDetails(
            _configuration["WebPush:Subject"] ?? "mailto:admin@example.com",
            publicKey,
            privateKey);
        foreach (var reminder in due)
        {
            if (reminder.Device == null) continue;
            try
            {
                var subscription = new PushSubscription(reminder.Device.Endpoint, reminder.Device.P256dh, reminder.Device.Auth);
                var payload = JsonSerializer.Serialize(new
                {
                    title = reminder.Name,
                    body = "Your reminder is due.",
                    url = $"/reminders?alarm={reminder.LocalReminderId}",
                    tag = $"reminder-{reminder.DeviceId}-{reminder.LocalReminderId}"
                });
                await client.SendNotificationAsync(subscription, payload, vapid, ct);

                var sentOccurrence = reminder.NextOccurrence;
                reminder.LastSentForOccurrence = sentOccurrence;
                if (reminder.Recurrence == (int)RecurrenceType.Once)
                {
                    reminder.IsEnabled = false;
                    reminder.NextOccurrence = DateTime.MaxValue;
                }
                else
                {
                    var localReminder = new Reminder
                    {
                        StartDate = reminder.StartDate,
                        ReminderTime = reminder.ReminderTime,
                        Recurrence = (RecurrenceType)reminder.Recurrence,
                        RecurrenceInterval = reminder.RecurrenceInterval,
                        EndDate = reminder.EndDate
                    };
                    reminder.NextOccurrence = ReminderCalculator.ComputeNext(localReminder, now.AddSeconds(1));
                    if (reminder.NextOccurrence == DateTime.MaxValue) reminder.IsEnabled = false;
                    reminder.LastSentForOccurrence = null;
                }
                reminder.UpdatedAt = DateTime.UtcNow;
            }
            catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
            {
                _logger.LogInformation("Removing expired web push subscription for device {DeviceId}.", reminder.DeviceId);
                db.PushDevices.Remove(reminder.Device);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not deliver reminder {ReminderId} to device {DeviceId}.", reminder.LocalReminderId, reminder.DeviceId);
            }
        }
        await db.SaveChangesAsync(ct);
    }
}
