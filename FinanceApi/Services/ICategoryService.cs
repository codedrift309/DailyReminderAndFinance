using FinanceApi.DTOs;

namespace FinanceApi.Services;

public interface ICategoryService
{
    Task<List<CategoryDto>> GetAllAsync(bool includeInactive = false);
    Task<CategoryDto?> GetByIdAsync(int id);
    Task<CategoryDto> CreateAsync(CreateCategoryDto dto);
    Task<CategoryDto?> UpdateAsync(int id, UpdateCategoryDto dto);
    Task<bool> DeleteAsync(int id);
}