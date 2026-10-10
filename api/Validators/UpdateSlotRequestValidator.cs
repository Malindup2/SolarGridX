/*
 * UpdateSlotRequestValidator.cs
 * Checks the date, time range, and capacity when an existing slot is updated.
 */

using FluentValidation;
using MicrogridApi.DTOs.Slots;

namespace MicrogridApi.Validators;

public class UpdateSlotRequestValidator : AbstractValidator<UpdateSlotRequest>
{
    public UpdateSlotRequestValidator()
    {
                // Reject a missing date, an invalid time format, or a non-positive capacity.

        RuleFor(x => x.SlotDate).NotEmpty();

        RuleFor(x => x.StartTime).NotEmpty()
            .Matches(@"^([01]\d|2[0-3]):[0-5]\d$")
            .WithMessage("StartTime must be in 24-hour HH:mm format, e.g. 09:00.");

        RuleFor(x => x.EndTime).NotEmpty()
            .Matches(@"^([01]\d|2[0-3]):[0-5]\d$")
            .WithMessage("EndTime must be in 24-hour HH:mm format, e.g. 10:00.");

        RuleFor(x => x.CapacityKwh).GreaterThan(0);

        RuleFor(x => x)
            .Must(x => string.Compare(x.StartTime, x.EndTime, StringComparison.Ordinal) < 0)
            .WithName("StartTime")
            .WithMessage("StartTime must be earlier than EndTime.");
    }
}