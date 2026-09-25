/*
 * StationScheduleRequestValidator.cs
 * Checks operating hours and active days when a station schedule is updated.
 */

using System.Globalization;
using FluentValidation;
using MicrogridApi.DTOs.Stations;

namespace MicrogridApi.Validators;

public sealed class StationScheduleRequestValidator
    : AbstractValidator<StationScheduleRequest>
{
    public StationScheduleRequestValidator()
    {
        // Require valid 24-hour times and unique named weekdays.
        RuleFor(x => x.OpenTime)
            .Must(IsValidTime)
            .WithMessage("OpenTime must use HH:mm.");

        RuleFor(x => x.CloseTime)
            .Must(IsValidTime)
            .WithMessage("CloseTime must use HH:mm.");

        RuleFor(x => x.ActiveDays)
            .Must(HasValidDays)
            .WithMessage("ActiveDays must contain unique weekday names.");

        RuleFor(x => x.CloseTime)
            .Must((request, closeTime) =>
            {
                if (!TimeOnly.TryParseExact(
                        request.OpenTime, "HH:mm",
                        CultureInfo.InvariantCulture, DateTimeStyles.None,
                        out var open) ||
                    !TimeOnly.TryParseExact(
                        closeTime, "HH:mm",
                        CultureInfo.InvariantCulture, DateTimeStyles.None,
                        out var close))
                {
                    return true; // The format rules report invalid times.
                }

                return open < close;
            })
            .WithMessage("CloseTime must be later than OpenTime.");
    }

    private static bool IsValidTime(string? value)
    {
        // Accept exact times such as 08:00 and 18:30.
        return TimeOnly.TryParseExact(
            value, "HH:mm",
            CultureInfo.InvariantCulture, DateTimeStyles.None,
            out _);
    }

    private static bool HasValidDays(List<string>? days)
    {
        // Accept each weekday name once, ignoring letter case.
        if (days is not { Count: > 0 })
        {
            return false;
        }

        var weekdayNames = Enum.GetNames<DayOfWeek>();
        return days.All(day =>
                   !string.IsNullOrWhiteSpace(day) &&
                   weekdayNames.Contains(
                       day.Trim(), StringComparer.OrdinalIgnoreCase)) &&
               days.Select(day => day.Trim())
                   .Distinct(StringComparer.OrdinalIgnoreCase)
                   .Count() == days.Count;
    }
}