using FluentValidation;
using MicrogridApi.DTOs.Slots;

namespace MicrogridApi.Validators;

public class GenerateSlotsRequestValidator : AbstractValidator<GenerateSlotsRequest>
{
    public GenerateSlotsRequestValidator()
    {
        RuleFor(x => x.Date).NotEmpty();
    }
}