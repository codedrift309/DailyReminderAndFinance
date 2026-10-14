using FinanceApi.DTOs;
using FinanceApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace FinanceApi.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reports;
    private readonly IExpenseService _expenses;
    private readonly IIncomeService _incomes;
    public ReportsController(IReportService reports, IExpenseService expenses, IIncomeService incomes)
    { _reports = reports; _expenses = expenses; _incomes = incomes; }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        => Ok(await _reports.GetSummaryAsync(from, to));

    [HttpGet("categories")]
    public async Task<IActionResult> Categories([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        => Ok(await _reports.GetCategoryBreakdownAsync(from, to));

    [HttpGet("monthly-comparison")]
    public async Task<IActionResult> MonthlyComparison([FromQuery] int? year)
        => Ok(await _reports.GetMonthlyComparisonAsync(year ?? DateTime.Now.Year));

    [HttpGet("expenses")]
    public async Task<IActionResult> ExpenseReport(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int? categoryId, [FromQuery] string? granularity = "daily")
    {
        var trend = await _reports.GetExpenseTrendAsync(from, to, granularity ?? "daily");
        var byCategory = await _reports.GetCategoryBreakdownAsync(from, to);
        var data = await _expenses.GetAllAsync(categoryId, from, to, null, null, null, null, null, "paymentDate", "desc", 1, 1000);
        return Ok(new { trend, byCategory, transactions = data });
    }

    [HttpGet("income")]
    public async Task<IActionResult> IncomeReport(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] string? incomeType)
    {
        var data = await _incomes.GetAllAsync(from, to, null, null, incomeType, null, null, null, "receivedDate", "desc", 1, 1000);
        return Ok(data);
    }

    [HttpGet("income-vs-expense")]
    public async Task<IActionResult> IncomeVsExpense([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        => Ok(await _reports.GetIncomeVsExpenseAsync(from, to));

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string type = "expenses",
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
        [FromQuery] int? categoryId = null, [FromQuery] string? incomeType = null)
    {
        var sb = new System.Text.StringBuilder();
        if (type == "income")
        {
            var data = await _incomes.GetAllAsync(from, to, null, null, incomeType, null, null, null, "receivedDate", "asc", 1, 100000);
            sb.AppendLine("Id,IncomeType,Description,Amount,ReceivedDate,EntryDate,Notes");
            foreach (var i in data.Items)
                sb.AppendLine($"{i.Id},\"{Esc(i.IncomeType)}\",\"{Esc(i.Description)}\",{i.Amount},{i.ReceivedDate:yyyy-MM-dd},{i.EntryDate:yyyy-MM-dd},\"{Esc(i.Notes)}\"");
        }
        else
        {
            var data = await _expenses.GetAllAsync(categoryId, from, to, null, null, null, null, null, "paymentDate", "asc", 1, 100000);
            sb.AppendLine("Id,Category,Description,Amount,PaymentDate,EntryDate,PaymentMethod,Notes");
            foreach (var e in data.Items)
                sb.AppendLine($"{e.Id},\"{Esc(e.CategoryName)}\",\"{Esc(e.Description)}\",{e.Amount},{e.PaymentDate:yyyy-MM-dd},{e.EntryDate:yyyy-MM-dd},\"{Esc(e.PaymentMethod)}\",\"{Esc(e.Notes)}\"");
        }
        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"export_{type}_{DateTime.Now:yyyyMMddHHmmss}.csv");
    }

    private static string Esc(string? s) => (s ?? "").Replace("\"", "\"\"");
}