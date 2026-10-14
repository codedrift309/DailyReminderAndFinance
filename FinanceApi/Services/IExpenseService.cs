using FinanceApi.DTOs;

namespace FinanceApi.Services;

public interface IExpenseService
{
    Task<PagedResult<ExpenseDto>> GetAllAsync(
        int? categoryId, DateTime? paymentFrom, DateTime? paymentTo,
        DateTime? entryFrom, DateTime? entryTo, decimal? minAmount, decimal? maxAmount,
        string? search, string? sortBy, string? sortDir, int page, int pageSize);
    Task<ExpenseDto?> GetByIdAsync(int id);
    Task<ExpenseDto> CreateAsync(CreateExpenseDto dto);
    Task<ExpenseDto?> UpdateAsync(int id, UpdateExpenseDto dto);
    Task<bool> DeleteAsync(int id);
    Task<decimal> GetTotalAsync(DateTime? from, DateTime? to);
}