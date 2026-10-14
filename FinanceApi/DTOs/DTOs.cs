using System.ComponentModel.DataAnnotations;
using FinanceApi.Models;

namespace FinanceApi.DTOs;

public record CategoryDto(int Id, string Name, bool IsActive, bool IsDefault, DateTime CreatedAt);
public record CreateCategoryDto
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}
public record UpdateCategoryDto
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public record ExpenseDto
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public DateTime EntryDate { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public record CreateExpenseDto
{
    [Required]
    public int CategoryId { get; set; }
    [MaxLength(500)]
    public string? Description { get; set; }
    [Required, Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }
    [Required]
    public DateTime PaymentDate { get; set; }
    public DateTime? EntryDate { get; set; }
    [MaxLength(100)]
    public string? PaymentMethod { get; set; }
    [MaxLength(2000)]
    public string? Notes { get; set; }
}

public record UpdateExpenseDto : CreateExpenseDto { }

public record IncomeDto
{
    public int Id { get; set; }
    public string IncomeType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime ReceivedDate { get; set; }
    public DateTime EntryDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public record CreateIncomeDto
{
    [Required, MaxLength(100)]
    public string IncomeType { get; set; } = string.Empty;
    [MaxLength(500)]
    public string? Description { get; set; }
    [Required, Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }
    [Required]
    public DateTime ReceivedDate { get; set; }
    public DateTime? EntryDate { get; set; }
    [MaxLength(2000)]
    public string? Notes { get; set; }
}

public record UpdateIncomeDto : CreateIncomeDto { }

public record ReminderDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public string ReminderTime { get; set; } = "09:00:00";
    public RecurrenceType Recurrence { get; set; }
    public int? RecurrenceInterval { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsEnabled { get; set; }
    public DateTime NextOccurrence { get; set; }
    public DateTime? LastNotificationAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public record CreateReminderDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(2000)]
    public string? Description { get; set; }
    [Required]
    public DateTime StartDate { get; set; }
    [Required]
    public string ReminderTime { get; set; } = "09:00:00";
    [Required]
    public RecurrenceType Recurrence { get; set; }
    public int? RecurrenceInterval { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsEnabled { get; set; } = true;
}

public record UpdateReminderDto : CreateReminderDto { }

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public record SnoozeReminderDto
{
    [Required, Range(1, 10080)]
    public int Minutes { get; set; } = 10;
}