using FinanceApi.DTOs;
using FinanceApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace FinanceApi.Controllers;

[ApiController]
[Route("api/reminders")]
public class RemindersController : ControllerBase
{
    private readonly IReminderService _svc;
    public RemindersController(IReminderService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeDisabled = true) => Ok(await _svc.GetAllAsync(includeDisabled));

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReminderDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try { return Ok(await _svc.CreateAsync(dto)); }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateReminderDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var item = await _svc.UpdateAsync(id, dto);
            return item == null ? NotFound() : Ok(item);
        }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(int id)
    {
        var item = await _svc.CompleteAsync(id);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpPost("{id}/snooze")]
    public async Task<IActionResult> Snooze(int id, [FromBody] SnoozeReminderDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var item = await _svc.SnoozeAsync(id, dto.Minutes);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpGet("due")]
    public async Task<IActionResult> Due() => Ok(await _svc.GetDueAsync());

    [HttpGet("overdue")]
    public async Task<IActionResult> Overdue() => Ok(await _svc.GetOverdueAsync());
}