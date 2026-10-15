using System.ComponentModel.DataAnnotations;
using FinanceApi.Data;
using FinanceApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceApi.Controllers;

[ApiController]
[Route("api/push")]
public class PushController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;

    public PushController(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    [HttpGet("public-key")]
    public IActionResult PublicKey()
    {
        var key = _configuration["WebPush:PublicKey"];
        return string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(_configuration["WebPush:PrivateKey"])
            ? StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Web push is not configured on the server." })
            : Ok(new { publicKey = key });
    }

    [HttpPost("devices/{deviceId}/subscription")]
    public async Task<IActionResult> SaveSubscription(string deviceId, [FromBody] SavePushSubscriptionDto dto, CancellationToken ct)
    {
        if (!Guid.TryParse(deviceId, out _) || !Uri.TryCreate(dto.Endpoint, UriKind.Absolute, out var endpoint) || endpoint.Scheme != Uri.UriSchemeHttps)
            return BadRequest(new { error = "A valid device ID and HTTPS push endpoint are required." });

        var device = await _db.PushDevices.FindAsync(new object[] { deviceId }, ct);
        if (device == null)
        {
            device = new PushDevice { DeviceId = deviceId };
            _db.PushDevices.Add(device);
        }
        device.Endpoint = dto.Endpoint;
        device.P256dh = dto.P256dh;
        device.Auth = dto.Auth;
        device.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("devices/{deviceId}/subscription")]
    public async Task<IActionResult> DeleteSubscription(string deviceId, CancellationToken ct)
    {
        var device = await _db.PushDevices.FindAsync(new object[] { deviceId }, ct);
        if (device != null)
        {
            _db.PushDevices.Remove(device);
            await _db.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    [HttpPut("devices/{deviceId}/reminders/{reminderId:int}")]
    public async Task<IActionResult> UpsertReminder(string deviceId, int reminderId, [FromBody] PushReminderDto dto, CancellationToken ct)
    {
        if (!Guid.TryParse(deviceId, out _)) return BadRequest(new { error = "Invalid device ID." });
        if (!await _db.PushDevices.AnyAsync(d => d.DeviceId == deviceId, ct)) return NotFound(new { error = "Enable push notifications on this device first." });
        if (!TimeSpan.TryParse(dto.ReminderTime, out var time)) return BadRequest(new { error = "Invalid reminder time." });

        var reminder = await _db.PushReminders.FindAsync(new object[] { deviceId, reminderId }, ct);
        if (reminder == null)
        {
            reminder = new PushReminder { DeviceId = deviceId, LocalReminderId = reminderId };
            _db.PushReminders.Add(reminder);
        }
        reminder.Name = dto.Name.Trim();
        reminder.StartDate = dto.StartDate.Date;
        reminder.NextOccurrence = DateTime.SpecifyKind(dto.NextOccurrence, DateTimeKind.Unspecified);
        reminder.Recurrence = dto.Recurrence;
        reminder.RecurrenceInterval = Math.Clamp(dto.RecurrenceInterval ?? 1, 1, 3650);
        reminder.EndDate = dto.EndDate?.Date;
        reminder.ReminderTime = time;
        reminder.IsEnabled = dto.IsEnabled;
        reminder.LastSentForOccurrence = null;
        reminder.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("devices/{deviceId}/reminders/{reminderId:int}")]
    public async Task<IActionResult> DeleteReminder(string deviceId, int reminderId, CancellationToken ct)
    {
        var reminder = await _db.PushReminders.FindAsync(new object[] { deviceId, reminderId }, ct);
        if (reminder != null)
        {
            _db.PushReminders.Remove(reminder);
            await _db.SaveChangesAsync(ct);
        }
        return NoContent();
    }
}

public class SavePushSubscriptionDto
{
    [Required, MaxLength(2048)] public string Endpoint { get; set; } = string.Empty;
    [Required, MaxLength(256)] public string P256dh { get; set; } = string.Empty;
    [Required, MaxLength(256)] public string Auth { get; set; } = string.Empty;
}

public class PushReminderDto
{
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    public DateTime NextOccurrence { get; set; }
    public DateTime StartDate { get; set; }
    [Range(0, 5)] public int Recurrence { get; set; }
    [Range(1, 3650)] public int? RecurrenceInterval { get; set; }
    public DateTime? EndDate { get; set; }
    [Required] public string ReminderTime { get; set; } = "09:00:00";
    public bool IsEnabled { get; set; }
}
