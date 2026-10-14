using FinanceApi.DTOs;

namespace FinanceApi.Services;

public interface IIncomeService
{
    Task<PagedResult<IncomeDto>> GetAllAsync(
        DateTime? receivedFrom, DateTime? receivedTo, DateTime? entryFrom, DateTime? entryTo,
        string? incomeType, decimal? minAmount, decimal? maxAmount, string? search,
        string? sortBy, string? sortDir, int page, int pageSize);
    Task<IncomeDto?> GetByIdAsync(int id);
    Task<IncomeDto> CreateAsync(CreateIncomeDto dto);
    Task<IncomeDto?> UpdateAsync(int id, UpdateIncomeDto dto);
    Task<bool> DeleteAsync(int id);
    Task<decimal> GetTotalAsync(DateTime? from, DateTime? to);
    Task<List<string>> GetTypesAsync();
}