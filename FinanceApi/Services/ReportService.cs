using FinanceApi.Data;
using Microsoft.EntityFrameworkCore;

namespace FinanceApi.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _db;
    public ReportService(AppDbContext db) => _db = db;

    public async Task<object> GetSummaryAsync(DateTime? from, DateTime? to)
    {
        var incQ = _db.Incomes.AsQueryable();
        var expQ = _db.Expenses.AsQueryable();
        if (from.HasValue) { incQ = incQ.Where(i => i.ReceivedDate >= from.Value.Date); expQ = expQ.Where(e => e.PaymentDate >= from.Value.Date); }
        if (to.HasValue) { incQ = incQ.Where(i => i.ReceivedDate <= to.Value.Date); expQ = expQ.Where(e => e.PaymentDate <= to.Value.Date); }

        var incList = await incQ.ToListAsync();
        var expList = await expQ.ToListAsync();
        var totalIncome = incList.Sum(i => i.Amount);
        var totalExpenses = expList.Sum(e => e.Amount);

        var now = DateTime.Now;
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var nextMonth = monthStart.AddMonths(1);
        var curIncList = await _db.Incomes.Where(i => i.ReceivedDate >= monthStart && i.ReceivedDate < nextMonth).ToListAsync();
        var curExpList = await _db.Expenses.Where(e => e.PaymentDate >= monthStart && e.PaymentDate < nextMonth).ToListAsync();
        var curInc = curIncList.Sum(i => i.Amount);
        var curExp = curExpList.Sum(e => e.Amount);

        return new
        {
            totalIncome,
            totalExpenses,
            netBalance = totalIncome - totalExpenses,
            currentMonthIncome = curInc,
            currentMonthExpenses = curExp,
            currentMonthNet = curInc - curExp
        };
    }

    public async Task<object> GetCategoryBreakdownAsync(DateTime? from, DateTime? to)
    {
        var q = _db.Expenses.Include(e => e.Category).AsQueryable();
        if (from.HasValue) q = q.Where(e => e.PaymentDate >= from.Value.Date);
        if (to.HasValue) q = q.Where(e => e.PaymentDate <= to.Value.Date);
        var rows = await q.ToListAsync();
        var grouped = rows.GroupBy(e => e.Category?.Name ?? "Unknown")
            .Select(g => new { category = g.Key, total = g.Sum(x => x.Amount), count = g.Count() })
            .OrderByDescending(x => x.total).ToList();
        return grouped;
    }

    public async Task<object> GetMonthlyComparisonAsync(int year)
    {
        var inc = await _db.Incomes.Where(i => i.ReceivedDate.Year == year).ToListAsync();
        var exp = await _db.Expenses.Where(e => e.PaymentDate.Year == year).ToListAsync();

        var result = new List<object>();
        for (int m = 1; m <= 12; m++)
        {
            var i = inc.Where(x => x.ReceivedDate.Month == m).Sum(x => x.Amount);
            var e = exp.Where(x => x.PaymentDate.Month == m).Sum(x => x.Amount);
            result.Add(new { month = m, income = i, expenses = e, net = i - e });
        }
        return result;
    }

    public async Task<object> GetExpenseTrendAsync(DateTime? from, DateTime? to, string granularity)
    {
        var q = _db.Expenses.AsQueryable();
        if (from.HasValue) q = q.Where(e => e.PaymentDate >= from.Value.Date);
        if (to.HasValue) q = q.Where(e => e.PaymentDate <= to.Value.Date);
        var rows = await q.ToListAsync();

        IEnumerable<object> data = granularity switch
        {
            "weekly" => rows.GroupBy(e => new { e.PaymentDate.Year, Week = System.Globalization.ISOWeek.GetWeekOfYear(e.PaymentDate) })
                .Select(g => new { label = $"{g.Key.Year}-W{g.Key.Week:D2}", total = g.Sum(x => x.Amount) }),
            "monthly" => rows.GroupBy(e => new { e.PaymentDate.Year, e.PaymentDate.Month })
                .Select(g => new { label = $"{g.Key.Year}-{g.Key.Month:D2}", total = g.Sum(x => x.Amount) }),
            "yearly" => rows.GroupBy(e => e.PaymentDate.Year)
                .Select(g => new { label = g.Key.ToString(), total = g.Sum(x => x.Amount) }),
            _ => rows.GroupBy(e => e.PaymentDate.Date)
                .Select(g => new { label = g.Key.ToString("yyyy-MM-dd"), total = g.Sum(x => x.Amount) })
        };
        return data.OrderBy(x => x.GetType().GetProperty("label")!.GetValue(x)).ToList();
    }

    public async Task<object> GetIncomeVsExpenseAsync(DateTime? from, DateTime? to)
    {
        var income = (from.HasValue || to.HasValue)
            ? await GetIncomeTotal(from, to)
            : await _db.Incomes.SumAsync(i => (decimal?)i.Amount) ?? 0m;
        var expense = (from.HasValue || to.HasValue)
            ? await GetExpenseTotal(from, to)
            : await _db.Expenses.SumAsync(e => (decimal?)e.Amount) ?? 0m;
        return new { income, expenses = expense, net = income - expense };
    }

    private async Task<decimal> GetIncomeTotal(DateTime? from, DateTime? to)
    {
        var q = _db.Incomes.AsQueryable();
        if (from.HasValue) q = q.Where(i => i.ReceivedDate >= from.Value.Date);
        if (to.HasValue) q = q.Where(i => i.ReceivedDate <= to.Value.Date);
        var list = await q.ToListAsync();
        return list.Sum(i => i.Amount);
    }

    private async Task<decimal> GetExpenseTotal(DateTime? from, DateTime? to)
    {
        var q = _db.Expenses.AsQueryable();
        if (from.HasValue) q = q.Where(e => e.PaymentDate >= from.Value.Date);
        if (to.HasValue) q = q.Where(e => e.PaymentDate <= to.Value.Date);
        var list = await q.ToListAsync();
        return list.Sum(e => e.Amount);
    }
}