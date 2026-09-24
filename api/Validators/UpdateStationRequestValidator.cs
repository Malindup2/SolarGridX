/*
 * UpdateStationRequestValidator.cs
 * Checks editable station details.
 */

using FluentValidation;
using MicrogridApi.DTOs.Stations;

namespace MicrogridApi.Validators;

public sealed class UpdateStationRequestValidator
    : AbstractValidator<UpdateStationRequest>
{
    public UpdateStationRequestValidator()
    {
        // Apply the same field limits used when a station is created.
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
    }
}