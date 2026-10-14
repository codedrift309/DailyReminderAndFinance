using FinanceApi.DTOs;
using FinanceApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace FinanceApi.Controllers;

[ApiController]
[Route("api/expenses")]
public class ExpensesController : ControllerBase
{
    private readonly IExpenseService _svc;
    public ExpensesController(IExpenseService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? categoryId,
        [FromQuery] DateTime? paymentFrom, [FromQuery] DateTime? paymentTo,
        [FromQuery] DateTime? entryFrom, [FromQuery] DateTime? entryTo,
        [FromQuery] decimal? minAmount, [FromQuery] decimal? maxAmount,
        [FromQuery] string? search, [FromQuery] string? sortBy, [FromQuery] string? sortDir,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var res = await _svc.GetAllAsync(categoryId, paymentFrom, paymentTo, entryFrom, entryTo, minAmount, maxAmount, search, sortBy, sortDir, page, pageSize);
        return Ok(res);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateExpenseDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try { return Ok(await _svc.CreateAsync(dto)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateExpenseDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var item = await _svc.UpdateAsync(id, dto);
            return item == null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("total")]
    public async Task<IActionResult> Total([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var total = await _svc.GetTotalAsync(from, to);
        return Ok(new { total });
    }
}