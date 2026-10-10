/*
 * UpdateReservationRequestValidator.cs
 * Checks the energy amount submitted when updating a reservation.
 */

using FluentValidation;
using MicrogridApi.DTOs.Reservations;

namespace MicrogridApi.Validators;

public class UpdateReservationRequestValidator : AbstractValidator<UpdateReservationRequest>
{
    public UpdateReservationRequestValidator()
    {
        RuleFor(x => x.EnergyKwh).GreaterThan(0);
    }
}
