using System.Globalization;
using MicrogridApi.DTOs.Stations;

namespace MicrogridApi.Validators;

// Checks shared by the create-station and update-schedule validators.
public static class ScheduleRules
{
    // Per-day hours: each entry is a unique, active weekday with valid HH:mm times and open < close.
    public static bool DayHoursAreValid(StationScheduleRequest? schedule, out string message)
    {
        message = "DayHours must list unique active weekdays, each with HH:mm times where CloseTime is after OpenTime.";
        var entries = schedule?.DayHours;
        if (entries is null || entries.Count == 0)
        {
            return true;
        }

        var active = (schedule!.ActiveDays ?? []).Select(d => d.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var weekdays = Enum.GetNames<DayOfWeek>();

        foreach (var entry in entries)
        {
            var day = entry.Day?.Trim();
            if (string.IsNullOrEmpty(day)
                || !weekdays.Contains(day, StringComparer.OrdinalIgnoreCase)
                || !active.Contains(day)
                || !seen.Add(day)
                || !TimeOnly.TryParseExact(entry.OpenTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var open)
                || !TimeOnly.TryParseExact(entry.CloseTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var close)
                || open >= close)
            {
                return false;
            }
        }

        return true;
    }
}
