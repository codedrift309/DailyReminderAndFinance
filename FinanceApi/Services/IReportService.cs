namespace FinanceApi.Services;

public interface IReportService
{
    Task<object> GetSummaryAsync(DateTime? from, DateTime? to);
    Task<object> GetCategoryBreakdownAsync(DateTime? from, DateTime? to);
    Task<object> GetMonthlyComparisonAsync(int year);
    Task<object> GetExpenseTrendAsync(DateTime? from, DateTime? to, string granularity);
    Task<object> GetIncomeVsExpenseAsync(DateTime? from, DateTime? to);
}