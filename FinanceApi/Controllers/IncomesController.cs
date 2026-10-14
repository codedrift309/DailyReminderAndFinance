using FinanceApi.DTOs;
using FinanceApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace FinanceApi.Controllers;

[ApiController]
[Route("api/incomes")]
public class IncomesController : ControllerBase
{
    private readonly IIncomeService _svc;
    public IncomesController(IIncomeService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime? receivedFrom, [FromQuery] DateTime? receivedTo,
        [FromQuery] DateTime? entryFrom, [FromQuery] DateTime? entryTo,
        [FromQuery] string? incomeType, [FromQuery] decimal? minAmount, [FromQuery] decimal? maxAmount,
        [FromQuery] string? search, [FromQuery] string? sortBy, [FromQuery] string? sortDir,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var res = await _svc.GetAllAsync(receivedFrom, receivedTo, entryFrom, entryTo, incomeType, minAmount, maxAmount, search, sortBy, sortDir, page, pageSize);
        return Ok(res);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateIncomeDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        return Ok(await _svc.CreateAsync(dto));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateIncomeDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var item = await _svc.UpdateAsync(id, dto);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("types")]
    public async Task<IActionResult> Types() => Ok(await _svc.GetTypesAsync());

    [HttpGet("total")]
    public async Task<IActionResult> Total([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var total = await _svc.GetTotalAsync(from, to);
        return Ok(new { total });
    }
}