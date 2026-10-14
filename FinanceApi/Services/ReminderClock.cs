namespace FinanceApi.Services;

/// <summary>
/// Reminder schedules are entered as local wall-clock times. Keep their comparisons
/// in India Standard Time even when the API runs in a UTC container.
/// </summary>
public static class ReminderClock
{
    private static readonly TimeZoneInfo IndiaTimeZone = TimeZoneInfo.CreateCustomTimeZone(
        "Asia/Kolkata", TimeSpan.FromMinutes(330), "India Standard Time", "India Standard Time");

    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IndiaTimeZone);
}
