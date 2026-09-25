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
