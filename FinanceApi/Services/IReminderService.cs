using FinanceApi.DTOs;

namespace FinanceApi.Services;

public interface IReminderService
{
    Task<List<ReminderDto>> GetAllAsync(bool includeDisabled = true);
    Task<ReminderDto?> GetByIdAsync(int id);
    Task<ReminderDto> CreateAsync(CreateReminderDto dto);
    Task<ReminderDto?> UpdateAsync(int id, UpdateReminderDto dto);
    Task<bool> DeleteAsync(int id);
    Task<ReminderDto?> CompleteAsync(int id);
    Task<ReminderDto?> SnoozeAsync(int id, int minutes);
    Task<List<ReminderDto>> GetDueAsync();
    Task<List<ReminderDto>> GetOverdueAsync();
    Task AcknowledgeNotificationAsync(int reminderId, DateTime scheduledAt);
}