/*
 * CreateStationRequestValidator.cs
 * Checks the station details and operating schedule before registration.
 */

using System.Globalization;
using FluentValidation;
using MicrogridApi.DTOs.Stations;

namespace MicrogridApi.Validators;

public sealed class CreateStationRequestValidator : AbstractValidator<CreateStationRequest>
{
     // Reject missing or invalid station details before any database write.
    public CreateStationRequestValidator()
    {

        RuleFor(x => x.StationName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Location).NotEmpty().MaximumLength(250);

        RuleFor(x => x.Latitude)
            .Must(value => value.HasValue &&
                           double.IsFinite(value.Value) &&
                           value.Value >= -90 &&
                           value.Value <= 90)
            .WithMessage("Latitude must be between -90 and 90.");

        RuleFor(x => x.Longitude)
            .Must(value => value.HasValue &&
                           double.IsFinite(value.Value) &&
                           value.Value >= -180 &&
                           value.Value <= 180)
            .WithMessage("Longitude must be between -180 and 180.");

        RuleFor(x => x.CapacityKwh)
            .Must(value => value.HasValue &&
                           double.IsFinite(value.Value) &&
                           value.Value > 0)
            .WithMessage("CapacityKwh must be greater than zero.");

        RuleFor(x => x.BatterySlotCount)
            .Must(value => value.HasValue && value.Value > 0)
            .WithMessage("BatterySlotCount must be greater than zero.");

        RuleFor(x => x.Type)
            .Must(value => value is "AC" or "DC")
            .WithMessage("Type must be AC or DC.");

        RuleFor(x => x.OperationalSchedule)
            .NotNull()
            .WithMessage("OperationalSchedule is required.");

        When(x => x.OperationalSchedule is not null, () =>
        {
            RuleFor(x => x.OperationalSchedule!.OpenTime)
                .Must(IsValidTime)
                .WithMessage("OpenTime must use HH:mm.");

            RuleFor(x => x.OperationalSchedule!.CloseTime)
                .Must(IsValidTime)
                .WithMessage("CloseTime must use HH:mm.");

            RuleFor(x => x.OperationalSchedule!.ActiveDays)
                .Must(HasValidDays)
                .WithMessage("ActiveDays must contain unique weekday names.");

            RuleFor(x => x.OperationalSchedule)
                .Must(schedule => ScheduleRules.DayHoursAreValid(schedule, out _))
                .WithMessage("DayHours must list unique active weekdays, each with HH:mm times where CloseTime is after OpenTime.");

            RuleFor(x => x.OperationalSchedule)
                .Must(schedule =>
                    TimeOnly.TryParseExact(
                        schedule!.OpenTime, "HH:mm",
                        CultureInfo.InvariantCulture, DateTimeStyles.None,
                        out var open) &&
                    TimeOnly.TryParseExact(
                        schedule.CloseTime, "HH:mm",
                        CultureInfo.InvariantCulture, DateTimeStyles.None,
                        out var close) &&
                    open < close)
                .WithMessage("CloseTime must be later than OpenTime.");
        });
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
                   weekdayNames.Contains(day.Trim(), StringComparer.OrdinalIgnoreCase)) &&
               days.Select(day => day.Trim())
                   .Distinct(StringComparer.OrdinalIgnoreCase)
                   .Count() == days.Count;
    }
}