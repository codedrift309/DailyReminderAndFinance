using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinanceApi.Models;

public enum RecurrenceType
{
    Once = 0,
    Daily = 1,
    Monthly = 2,
    Yearly = 3,
    EveryDays = 4,
    EveryMonths = 5
}

public class ExpenseCategory
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}

public class Expense
{
    public int Id { get; set; }

    [Required]
    public int CategoryId { get; set; }
    public ExpenseCategory? Category { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    public DateTime PaymentDate { get; set; }
    public DateTime EntryDate { get; set; }

    [MaxLength(100)]
    public string? PaymentMethod { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Income
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string IncomeType { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    public DateTime ReceivedDate { get; set; }
    public DateTime EntryDate { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Reminder
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public DateTime StartDate { get; set; }
    public TimeSpan ReminderTime { get; set; }

    public RecurrenceType Recurrence { get; set; } = RecurrenceType.Once;
    public int? RecurrenceInterval { get; set; }

    public DateTime? EndDate { get; set; }

    public bool IsEnabled { get; set; } = true;

    public DateTime NextOccurrence { get; set; }
    public DateTime? LastNotificationAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ReminderNotification> Notifications { get; set; } = new List<ReminderNotification>();
}

public class ReminderNotification
{
    public int Id { get; set; }

    [Required]
    public int ReminderId { get; set; }
    public Reminder? Reminder { get; set; }

    public DateTime ScheduledAt { get; set; }
    public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;

    [MaxLength(50)]
    public string Status { get; set; } = "Triggered"; // Triggered, Acknowledged, Missed

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// Push metadata and reminder schedules are separated from finance records. A device
// ID is generated locally by the browser and is not an account or cross-device ID.
public class PushDevice
{
    [Key, MaxLength(64)]
    public string DeviceId { get; set; } = string.Empty;

    [Required, MaxLength(2048)]
    public string Endpoint { get; set; } = string.Empty;

    [Required, MaxLength(256)]
    public string P256dh { get; set; } = string.Empty;

    [Required, MaxLength(256)]
    public string Auth { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<PushReminder> Reminders { get; set; } = new List<PushReminder>();
}

public class PushReminder
{
    [MaxLength(64)]
    public string DeviceId { get; set; } = string.Empty;

    public int LocalReminderId { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    // Wall-clock time in Asia/Kolkata, matching the reminder UI.
    public DateTime StartDate { get; set; }
    public DateTime NextOccurrence { get; set; }
    public int Recurrence { get; set; }
    public int RecurrenceInterval { get; set; } = 1;
    public DateTime? EndDate { get; set; }
    public TimeSpan ReminderTime { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTime? LastSentForOccurrence { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public PushDevice? Device { get; set; }
}
