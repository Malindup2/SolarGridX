using FluentValidation;
using MicrogridApi.DTOs.Reservations;

namespace MicrogridApi.Validators;

public class CreateReservationRequestValidator : AbstractValidator<CreateReservationRequest>
{
    public CreateReservationRequestValidator()
    {
        RuleFor(x => x.Nic)
            .NotEmpty()
            .Matches(@"^([0-9]{9}[vVxX]|[0-9]{12})$")
            .WithMessage("NIC must be a valid old (9 digits + V/X) or new (12 digits) format.");

        RuleFor(x => x.StationId).NotEmpty();
        RuleFor(x => x.SlotId).NotEmpty();
        RuleFor(x => x.ReservationDate).NotEmpty();

        RuleFor(x => x.StartTime).NotEmpty()
            .Matches(@"^([01]\d|2[0-3]):[0-5]\d$")
            .WithMessage("StartTime must be in 24-hour HH:mm format, e.g. 09:00.");

        RuleFor(x => x.EndTime).NotEmpty()
            .Matches(@"^([01]\d|2[0-3]):[0-5]\d$")
            .WithMessage("EndTime must be in 24-hour HH:mm format, e.g. 10:00.");

        RuleFor(x => x.EnergyKwh).GreaterThan(0);
    }
}
