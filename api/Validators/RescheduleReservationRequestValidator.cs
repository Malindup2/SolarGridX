/*
 * RescheduleReservationRequestValidator.cs
 * Checks the destination slot identifier submitted when rescheduling a reservation.
 */

using FluentValidation;
using MicrogridApi.DTOs.Reservations;

namespace MicrogridApi.Validators;

public class RescheduleReservationRequestValidator : AbstractValidator<RescheduleReservationRequest>
{
    public RescheduleReservationRequestValidator()
    {
        RuleFor(x => x.SlotId).NotEmpty();
    }
}
