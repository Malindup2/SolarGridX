using FluentValidation;
using MicrogridApi.DTOs.Slots;

namespace MicrogridApi.Validators;

public class BulkAvailabilityRequestValidator : AbstractValidator<BulkAvailabilityRequest>
{
    public BulkAvailabilityRequestValidator()
    {
        RuleFor(x => x.SlotIds).NotEmpty();
    }
}