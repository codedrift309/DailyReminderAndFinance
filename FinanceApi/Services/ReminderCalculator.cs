using FinanceApi.Models;

namespace FinanceApi.Services;

public static class ReminderCalculator
{
    public static DateTime ComputeNext(Reminder r, DateTime from)
    {
        // from is the reference time (now) for finding next occurrence
        var start = r.StartDate.Date + r.ReminderTime;
        if (r.Recurrence == RecurrenceType.Once)
        {
            return start;
        }

        DateTime candidate = start;
        if (candidate >= from) 
        {
            // ensure not past end date
            if (r.EndDate.HasValue && candidate > r.EndDate.Value.Date.AddDays(1).AddTicks(-1)) return DateTime.MaxValue;
            return candidate;
        }

        int safety = 0;
        while (candidate < from && safety < 100000)
        {
            candidate = NextAfter(candidate, r);
            safety++;
            if (candidate == DateTime.MaxValue) break;
        }
        if (r.EndDate.HasValue && candidate > r.EndDate.Value.Date.AddDays(1).AddTicks(-1)) return DateTime.MaxValue;
        return candidate;
    }

    private static DateTime NextAfter(DateTime current, Reminder r)
    {
        int interval = Math.Max(1, r.RecurrenceInterval ?? 1);
        switch (r.Recurrence)
        {
            case RecurrenceType.Daily:
                return current.AddDays(interval);
            case RecurrenceType.Monthly:
                {
                    var nextMonth = current.AddMonths(interval);
                    int day = Math.Min(r.StartDate.Day, DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month));
                    // handle month-end / clamping based on start day
                    int targetDay = Math.Min(r.StartDate.Day, DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month));
                    return new DateTime(nextMonth.Year, nextMonth.Month, targetDay, r.ReminderTime.Hours, r.ReminderTime.Minutes, r.ReminderTime.Seconds);
                }
            case RecurrenceType.Yearly:
                {
                    var next = current.AddYears(interval);
                    int month = r.StartDate.Month;
                    int day = Math.Min(r.StartDate.Day, DateTime.DaysInMonth(next.Year, month));
                    return new DateTime(next.Year, month, day, r.ReminderTime.Hours, r.ReminderTime.Minutes, r.ReminderTime.Seconds);
                }
            case RecurrenceType.EveryDays:
                return current.AddDays(interval);
            case RecurrenceType.EveryMonths:
                {
                    var nextMonth = current.AddMonths(interval);
                    int targetDay = Math.Min(r.StartDate.Day, DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month));
                    return new DateTime(nextMonth.Year, nextMonth.Month, targetDay, r.ReminderTime.Hours, r.ReminderTime.Minutes, r.ReminderTime.Seconds);
                }
            default:
                return current.AddDays(1);
        }
    }

    // First occurrence after creation
    public static DateTime Initial(Reminder r)
    {
        return ComputeNext(r, ReminderClock.Now.AddSeconds(-1));
    }
}
