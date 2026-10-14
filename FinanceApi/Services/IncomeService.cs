using FinanceApi.Data;
using FinanceApi.DTOs;
using FinanceApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceApi.Services;

public class IncomeService : IIncomeService
{
    private readonly AppDbContext _db;
    private static readonly string[] DefaultTypes = { "Salary", "Rent Received", "Borrow Return / Money Returned" };
    public IncomeService(AppDbContext db) => _db = db;

    public async Task<PagedResult<IncomeDto>> GetAllAsync(
        DateTime? receivedFrom, DateTime? receivedTo, DateTime? entryFrom, DateTime? entryTo,
        string? incomeType, decimal? minAmount, decimal? maxAmount, string? search,
        string? sortBy, string? sortDir, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.Incomes.AsQueryable();
        if (!string.IsNullOrWhiteSpace(incomeType)) q = q.Where(i => i.IncomeType == incomeType);
        if (receivedFrom.HasValue) q = q.Where(i => i.ReceivedDate >= receivedFrom.Value.Date);
        if (receivedTo.HasValue) q = q.Where(i => i.ReceivedDate <= receivedTo.Value.Date.AddDays(1).AddTicks(-1));
        if (entryFrom.HasValue) q = q.Where(i => i.EntryDate >= entryFrom.Value.Date);
        if (entryTo.HasValue) q = q.Where(i => i.EntryDate <= entryTo.Value.Date.AddDays(1).AddTicks(-1));
        if (minAmount.HasValue) q = q.Where(i => i.Amount >= minAmount.Value);
        if (maxAmount.HasValue) q = q.Where(i => i.Amount <= maxAmount.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(i => (i.Description != null && i.Description.ToLower().Contains(s)) ||
                             (i.Notes != null && i.Notes.ToLower().Contains(s)) ||
                             i.IncomeType.ToLower().Contains(s));
        }

        q = (sortBy?.ToLower(), (sortDir ?? "desc").ToLower()) switch
        {
            ("amount", "asc") => q.OrderBy(i => i.Amount),
            ("amount", _) => q.OrderByDescending(i => i.Amount),
            ("entrydate", "asc") => q.OrderBy(i => i.EntryDate),
            ("entrydate", _) => q.OrderByDescending(i => i.EntryDate),
            ("receiveddate", "asc") => q.OrderBy(i => i.ReceivedDate),
            _ => q.OrderByDescending(i => i.ReceivedDate)
        };

        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResult<IncomeDto> { Items = items.Select(Map).ToList(), Total = total, Page = page, PageSize = pageSize };
    }

    public async Task<IncomeDto?> GetByIdAsync(int id)
    {
        var i = await _db.Incomes.FindAsync(id);
        return i == null ? null : Map(i);
    }

    public async Task<IncomeDto> CreateAsync(CreateIncomeDto dto)
    {
        var inc = new Income
        {
            IncomeType = dto.IncomeType.Trim(),
            Description = dto.Description,
            Amount = dto.Amount,
            ReceivedDate = dto.ReceivedDate.Date,
            EntryDate = (dto.EntryDate?.Date) ?? DateTime.Today,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Incomes.Add(inc);
        await _db.SaveChangesAsync();
        return Map(inc);
    }

    public async Task<IncomeDto?> UpdateAsync(int id, UpdateIncomeDto dto)
    {
        var inc = await _db.Incomes.FindAsync(id);
        if (inc == null) return null;
        inc.IncomeType = dto.IncomeType.Trim();
        inc.Description = dto.Description;
        inc.Amount = dto.Amount;
        inc.ReceivedDate = dto.ReceivedDate.Date;
        if (dto.EntryDate.HasValue) inc.EntryDate = dto.EntryDate.Value.Date;
        inc.Notes = dto.Notes;
        inc.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Map(inc);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var inc = await _db.Incomes.FindAsync(id);
        if (inc == null) return false;
        _db.Incomes.Remove(inc);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<decimal> GetTotalAsync(DateTime? from, DateTime? to)
    {
        var q = _db.Incomes.AsQueryable();
        if (from.HasValue) q = q.Where(i => i.ReceivedDate >= from.Value.Date);
        if (to.HasValue) q = q.Where(i => i.ReceivedDate <= to.Value.Date);
        var list = await q.ToListAsync();
        return list.Sum(i => i.Amount);
    }

    public async Task<List<string>> GetTypesAsync()
    {
        var existing = await _db.Incomes.Select(i => i.IncomeType).Distinct().ToListAsync();
        return DefaultTypes.Union(existing).OrderBy(x => x).ToList();
    }

    private static IncomeDto Map(Income i) => new()
    {
        Id = i.Id,
        IncomeType = i.IncomeType,
        Description = i.Description,
        Amount = i.Amount,
        ReceivedDate = i.ReceivedDate,
        EntryDate = i.EntryDate,
        Notes = i.Notes,
        CreatedAt = i.CreatedAt,
        UpdatedAt = i.UpdatedAt
    };
}