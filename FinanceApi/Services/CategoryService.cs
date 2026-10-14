using FinanceApi.Data;
using FinanceApi.DTOs;
using FinanceApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceApi.Services;

public class CategoryService : ICategoryService
{
    private readonly AppDbContext _db;
    public CategoryService(AppDbContext db) => _db = db;

    private static string Normalize(string name) => name.Trim();

    public async Task<List<CategoryDto>> GetAllAsync(bool includeInactive = false)
    {
        var q = _db.ExpenseCategories.AsQueryable();
        if (!includeInactive) q = q.Where(c => c.IsActive);
        return await q.OrderBy(c => c.Name).Select(c => new CategoryDto(c.Id, c.Name, c.IsActive, c.IsDefault, c.CreatedAt)).ToListAsync();
    }

    public async Task<CategoryDto?> GetByIdAsync(int id)
    {
        var c = await _db.ExpenseCategories.FindAsync(id);
        return c == null ? null : new CategoryDto(c.Id, c.Name, c.IsActive, c.IsDefault, c.CreatedAt);
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryDto dto)
    {
        var name = Normalize(dto.Name);
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name is required.");
        var exists = await _db.ExpenseCategories.AnyAsync(c => c.Name.ToLower() == name.ToLower());
        if (exists) throw new InvalidOperationException("A category with this name already exists.");

        var cat = new ExpenseCategory { Name = name, IsActive = true, IsDefault = false, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _db.ExpenseCategories.Add(cat);
        await _db.SaveChangesAsync();
        return new CategoryDto(cat.Id, cat.Name, cat.IsActive, cat.IsDefault, cat.CreatedAt);
    }

    public async Task<CategoryDto?> UpdateAsync(int id, UpdateCategoryDto dto)
    {
        var cat = await _db.ExpenseCategories.FindAsync(id);
        if (cat == null) return null;
        var name = Normalize(dto.Name);
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name is required.");
        var dup = await _db.ExpenseCategories.AnyAsync(c => c.Id != id && c.Name.ToLower() == name.ToLower());
        if (dup) throw new InvalidOperationException("A category with this name already exists.");
        cat.Name = name;
        cat.IsActive = dto.IsActive;
        cat.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new CategoryDto(cat.Id, cat.Name, cat.IsActive, cat.IsDefault, cat.CreatedAt);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var cat = await _db.ExpenseCategories.FindAsync(id);
        if (cat == null) return false;
        if (cat.IsDefault) throw new InvalidOperationException("Default categories cannot be deleted.");
        var inUse = await _db.Expenses.AnyAsync(e => e.CategoryId == id);
        if (inUse) throw new InvalidOperationException("Category is used by existing transactions.");
        _db.ExpenseCategories.Remove(cat);
        await _db.SaveChangesAsync();
        return true;
    }
}