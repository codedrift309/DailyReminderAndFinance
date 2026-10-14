using FinanceApi.Data;
using FinanceApi.DTOs;
using FinanceApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceApi.Services;

public class ExpenseService : IExpenseService
{
    private readonly AppDbContext _db;
    public ExpenseService(AppDbContext db) => _db = db;

    public async Task<PagedResult<ExpenseDto>> GetAllAsync(
        int? categoryId, DateTime? paymentFrom, DateTime? paymentTo,
        DateTime? entryFrom, DateTime? entryTo, decimal? minAmount, decimal? maxAmount,
        string? search, string? sortBy, string? sortDir, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.Expenses.Include(e => e.Category).AsQueryable();

        if (categoryId.HasValue) q = q.Where(e => e.CategoryId == categoryId.Value);
        if (paymentFrom.HasValue) q = q.Where(e => e.PaymentDate >= paymentFrom.Value.Date);
        if (paymentTo.HasValue) q = q.Where(e => e.PaymentDate <= paymentTo.Value.Date.AddDays(1).AddTicks(-1));
        if (entryFrom.HasValue) q = q.Where(e => e.EntryDate >= entryFrom.Value.Date);
        if (entryTo.HasValue) q = q.Where(e => e.EntryDate <= entryTo.Value.Date.AddDays(1).AddTicks(-1));
        if (minAmount.HasValue) q = q.Where(e => e.Amount >= minAmount.Value);
        if (maxAmount.HasValue) q = q.Where(e => e.Amount <= maxAmount.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(e =>
                (e.Description != null && e.Description.ToLower().Contains(s)) ||
                (e.Notes != null && e.Notes.ToLower().Contains(s)) ||
                (e.PaymentMethod != null && e.PaymentMethod.ToLower().Contains(s)) ||
                (e.Category != null && e.Category.Name.ToLower().Contains(s)));
        }

        q = (sortBy?.ToLower(), (sortDir ?? "desc").ToLower()) switch
        {
            ("amount", "asc") => q.OrderBy(e => e.Amount),
            ("amount", _) => q.OrderByDescending(e => e.Amount),
            ("entrydate", "asc") => q.OrderBy(e => e.EntryDate),
            ("entrydate", _) => q.OrderByDescending(e => e.EntryDate),
            ("paymentdate", "asc") => q.OrderBy(e => e.PaymentDate),
            _ => q.OrderByDescending(e => e.PaymentDate)
        };

        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PagedResult<ExpenseDto>
        {
            Items = items.Select(Map).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ExpenseDto?> GetByIdAsync(int id)
    {
        var e = await _db.Expenses.Include(x => x.Category).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null : Map(e);
    }

    public async Task<ExpenseDto> CreateAsync(CreateExpenseDto dto)
    {
        await EnsureCategoryExists(dto.CategoryId);
        var e = new Expense
        {
            CategoryId = dto.CategoryId,
            Description = dto.Description,
            Amount = dto.Amount,
            PaymentDate = dto.PaymentDate.Date,
            EntryDate = (dto.EntryDate?.Date) ?? DateTime.Today,
            PaymentMethod = dto.PaymentMethod,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Expenses.Add(e);
        await _db.SaveChangesAsync();
        await _db.Entry(e).Reference(x => x.Category).LoadAsync();
        return Map(e);
    }

    public async Task<ExpenseDto?> UpdateAsync(int id, UpdateExpenseDto dto)
    {
        var e = await _db.Expenses.FindAsync(id);
        if (e == null) return null;
        await EnsureCategoryExists(dto.CategoryId);
        e.CategoryId = dto.CategoryId;
        e.Description = dto.Description;
        e.Amount = dto.Amount;
        e.PaymentDate = dto.PaymentDate.Date;
        if (dto.EntryDate.HasValue) e.EntryDate = dto.EntryDate.Value.Date;
        e.PaymentMethod = dto.PaymentMethod;
        e.Notes = dto.Notes;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(e).Reference(x => x.Category).LoadAsync();
        return Map(e);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var e = await _db.Expenses.FindAsync(id);
        if (e == null) return false;
        _db.Expenses.Remove(e);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<decimal> GetTotalAsync(DateTime? from, DateTime? to)
    {
        var q = _db.Expenses.AsQueryable();
        if (from.HasValue) q = q.Where(e => e.PaymentDate >= from.Value.Date);
        if (to.HasValue) q = q.Where(e => e.PaymentDate <= to.Value.Date);
        var list = await q.ToListAsync();
        return list.Sum(e => e.Amount);
    }

    private async Task EnsureCategoryExists(int categoryId)
    {
        var ok = await _db.ExpenseCategories.AnyAsync(c => c.Id == categoryId && c.IsActive);
        if (!ok) throw new InvalidOperationException("Invalid or inactive category.");
    }

    private static ExpenseDto Map(Expense e) => new()
    {
        Id = e.Id,
        CategoryId = e.CategoryId,
        CategoryName = e.Category?.Name,
        Description = e.Description,
        Amount = e.Amount,
        PaymentDate = e.PaymentDate,
        EntryDate = e.EntryDate,
        PaymentMethod = e.PaymentMethod,
        Notes = e.Notes,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };
}