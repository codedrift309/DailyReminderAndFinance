using FinanceApi.Data;
using FinanceApi.DTOs;
using FinanceApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceApi.Services;

public class ReminderService : IReminderService
{
    private readonly AppDbContext _db;
    public ReminderService(AppDbContext db) => _db = db;

    public async Task<List<ReminderDto>> GetAllAsync(bool includeDisabled = true)
    {
        var q = _db.Reminders.AsQueryable();
        if (!includeDisabled) q = q.Where(r => r.IsEnabled);
        return (await q.OrderBy(r => r.NextOccurrence).ToListAsync()).Select(Map).ToList();
    }

    public async Task<ReminderDto?> GetByIdAsync(int id)
    {
        var r = await _db.Reminders.FindAsync(id);
        return r == null ? null : Map(r);
    }

    public async Task<ReminderDto> CreateAsync(CreateReminderDto dto)
    {
        ValidateInterval(dto.Recurrence, dto.RecurrenceInterval);
        var r = new Reminder
        {
            Name = dto.Name.Trim(),
            Description = dto.Description,
            StartDate = dto.StartDate.Date,
            ReminderTime = TimeSpan.Parse(dto.ReminderTime),
            Recurrence = dto.Recurrence,
            RecurrenceInterval = dto.RecurrenceInterval,
            EndDate = dto.EndDate?.Date,
            IsEnabled = dto.IsEnabled,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        r.NextOccurrence = r.IsEnabled ? ReminderCalculator.Initial(r) : DateTime.MaxValue;
        _db.Reminders.Add(r);
        await _db.SaveChangesAsync();
        return Map(r);
    }

    public async Task<ReminderDto?> UpdateAsync(int id, UpdateReminderDto dto)
    {
        var r = await _db.Reminders.FindAsync(id);
        if (r == null) return null;
        ValidateInterval(dto.Recurrence, dto.RecurrenceInterval);
        r.Name = dto.Name.Trim();
        r.Description = dto.Description;
        r.StartDate = dto.StartDate.Date;
        r.ReminderTime = TimeSpan.Parse(dto.ReminderTime);
        r.Recurrence = dto.Recurrence;
        r.RecurrenceInterval = dto.RecurrenceInterval;
        r.EndDate = dto.EndDate?.Date;
        r.IsEnabled = dto.IsEnabled;
        r.UpdatedAt = DateTime.UtcNow;
        r.NextOccurrence = r.IsEnabled ? ReminderCalculator.ComputeNext(r, ReminderClock.Now) : DateTime.MaxValue;
        await _db.SaveChangesAsync();
        return Map(r);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var r = await _db.Reminders.FindAsync(id);
        if (r == null) return false;
        _db.Reminders.Remove(r);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<ReminderDto?> CompleteAsync(int id)
    {
        var r = await _db.Reminders.FindAsync(id);
        if (r == null) return null;
        var sched = r.NextOccurrence;
        var notif = await _db.ReminderNotifications.FirstOrDefaultAsync(n => n.ReminderId == id && n.ScheduledAt == sched);
        if (notif != null) notif.Status = "Completed";
        if (r.Recurrence == RecurrenceType.Once)
        {
            r.IsEnabled = false;
            r.NextOccurrence = DateTime.MaxValue;
        }
        else
        {
            r.NextOccurrence = ReminderCalculator.ComputeNext(r, ReminderClock.Now.AddSeconds(1));
        }
        r.LastNotificationAt = DateTime.UtcNow;
        r.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Map(r);
    }

    public async Task<ReminderDto?> SnoozeAsync(int id, int minutes)
    {
        var r = await _db.Reminders.FindAsync(id);
        if (r == null) return null;
        r.NextOccurrence = ReminderClock.Now.AddMinutes(minutes);
        r.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Map(r);
    }

    public async Task<List<ReminderDto>> GetDueAsync()
    {
        var now = ReminderClock.Now;
        var list = await _db.Reminders.Where(r => r.IsEnabled && r.NextOccurrence <= now && r.NextOccurrence != DateTime.MaxValue).ToListAsync();
        return list.Select(Map).ToList();
    }

    public async Task<List<ReminderDto>> GetOverdueAsync()
    {
        var now = ReminderClock.Now;
        var list = await _db.Reminders.Where(r => r.IsEnabled && r.NextOccurrence < now.AddMinutes(-5) && r.NextOccurrence != DateTime.MaxValue).ToListAsync();
        return list.Select(Map).ToList();
    }

    public async Task AcknowledgeNotificationAsync(int reminderId, DateTime scheduledAt)
    {
        var n = await _db.ReminderNotifications.FirstOrDefaultAsync(x => x.ReminderId == reminderId && x.ScheduledAt == scheduledAt);
        if (n != null) { n.Status = "Acknowledged"; await _db.SaveChangesAsync(); }
    }

    private static void ValidateInterval(RecurrenceType type, int? interval)
    {
        if (type is RecurrenceType.EveryDays or RecurrenceType.EveryMonths)
        {
            if (!interval.HasValue || interval.Value < 1) throw new ArgumentException("Recurrence interval must be at least 1.");
        }
    }

    private static ReminderDto Map(Reminder r) => new()
    {
        Id = r.Id,
        Name = r.Name,
        Description = r.Description,
        StartDate = r.StartDate,
        ReminderTime = r.ReminderTime.ToString(),
        Recurrence = r.Recurrence,
        RecurrenceInterval = r.RecurrenceInterval,
        EndDate = r.EndDate,
        IsEnabled = r.IsEnabled,
        NextOccurrence = r.NextOccurrence,
        LastNotificationAt = r.LastNotificationAt,
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt
    };
}
