using FinanceApi.Data;
using FinanceApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace FinanceApi.Services;

public class ReminderSchedulerService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<ReminderSchedulerService> _logger;
    public ReminderSchedulerService(IServiceProvider services, ILogger<ReminderSchedulerService> logger)
    {
        _services = services; _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
        await RunOnceAsync(stoppingToken);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RunOnceAsync(stoppingToken);
        }
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var now = DateTime.Now;
            var due = await db.Reminders.Where(r => r.IsEnabled && r.NextOccurrence != DateTime.MaxValue && r.NextOccurrence <= now).ToListAsync(ct);

            foreach (var r in due)
            {
                // duplicate prevention
                var exists = await db.ReminderNotifications.AnyAsync(n => n.ReminderId == r.Id && n.ScheduledAt == r.NextOccurrence, ct);
                if (!exists)
                {
                    db.ReminderNotifications.Add(new ReminderNotification
                    {
                        ReminderId = r.Id,
                        ScheduledAt = r.NextOccurrence,
                        TriggeredAt = DateTime.UtcNow,
                        Status = "Triggered"
                    });
                    r.LastNotificationAt = DateTime.UtcNow;
                    TriggerOsNotification(r.Name, r.Description);
                }

                // advance recurring
                if (r.Recurrence != RecurrenceType.Once)
                {
                    r.NextOccurrence = ReminderCalculator.ComputeNext(r, now.AddSeconds(1));
                    if (r.EndDate.HasValue && r.NextOccurrence > r.EndDate.Value.Date.AddDays(1).AddTicks(-1))
                    {
                        r.NextOccurrence = DateTime.MaxValue;
                    }
                }
                r.UpdatedAt = DateTime.UtcNow;
            }
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reminder scheduler error");
        }
    }

    private void TriggerOsNotification(string title, string? message)
    {
        try
        {
            var psi = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-WindowStyle Hidden -Command \"Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true; $n.ShowBalloonTip(6000,'{Escape(title)}','{Escape(message ?? string.Empty)}',[System.Windows.Forms.ToolTipIcon]::Info); Start-Sleep -Seconds 7; $n.Dispose()\"",
                UseShellExecute = false,
                CreateNoWindow = true
            };
            System.Diagnostics.Process.Start(psi);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OS notification failed");
        }
    }

    private static string Escape(string s) => s.Replace("'", "").Replace("\"", "").Replace("`", "");
}