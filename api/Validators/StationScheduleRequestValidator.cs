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

    // Validates proposed operating hours and active days.
    public StationScheduleRequestValidator()
    {

        RuleFor(x => x.OpenTime)
            .Must(IsValidTime)
            .WithMessage("OpenTime must use HH:mm.");

        RuleFor(x => x.CloseTime)
            .Must(IsValidTime)
            .WithMessage("CloseTime must use HH:mm.");

        RuleFor(x => x.ActiveDays)
            .Must(HasValidDays)
            .WithMessage("ActiveDays must contain unique weekday names.");

        RuleFor(x => x)
            .Must(request => ScheduleRules.DayHoursAreValid(request, out _))
            .WithMessage("DayHours must list unique active weekdays, each with HH:mm times where CloseTime is after OpenTime.");

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
                    return true;
                }

                return open < close;
            })
            .WithMessage("CloseTime must be later than OpenTime.");
    }


    // Checks for a time in 24-hour HH:mm format.
    private static bool IsValidTime(string? value)
    {

        return TimeOnly.TryParseExact(
            value, "HH:mm",
            CultureInfo.InvariantCulture, DateTimeStyles.None,
            out _);
    }

    // Checks for a nonempty list of unique weekday names.
    private static bool HasValidDays(List<string>? days)
    {

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