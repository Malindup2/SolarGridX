/*
 * NearbyStationsQueryValidator.cs
 * Checks the coordinates and radius used to search for nearby stations.
 */

using FluentValidation;
using MicrogridApi.DTOs.Stations;

namespace MicrogridApi.Validators;

public sealed class NearbyStationsQueryValidator
    : AbstractValidator<NearbyStationsQuery>
{
    public NearbyStationsQueryValidator()
    {
        // Check the search area before the service reads station data.
        RuleFor(x => x.Lat)
            .Must(value => value.HasValue &&
                           double.IsFinite(value.Value) &&
                           value.Value >= -90 &&
                           value.Value <= 90)
            .WithMessage("Latitude must be between -90 and 90.");

        RuleFor(x => x.Lng)
            .Must(value => value.HasValue &&
                           double.IsFinite(value.Value) &&
                           value.Value >= -180 &&
                           value.Value <= 180)
            .WithMessage("Longitude must be between -180 and 180.");

        RuleFor(x => x.RadiusKm)
            .Must(value => value.HasValue &&
                           double.IsFinite(value.Value) &&
                           value.Value > 0 &&
                           value.Value <= 50)
            .WithMessage("Radius must be greater than 0 and at most 50 km.");
    }
}