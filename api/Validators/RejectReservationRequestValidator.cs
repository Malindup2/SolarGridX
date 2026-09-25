using FluentValidation;
using MicrogridApi.DTOs.Reservations;

namespace MicrogridApi.Validators;

public class RejectReservationRequestValidator : AbstractValidator<RejectReservationRequest>
{
    public RejectReservationRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}
