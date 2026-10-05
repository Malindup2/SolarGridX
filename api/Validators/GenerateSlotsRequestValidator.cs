/*
 * GenerateSlotsRequestValidator.cs
 * Checks that a date was supplied before slot generation runs.
 */

using FluentValidation;
using MicrogridApi.DTOs.Slots;

namespace MicrogridApi.Validators;

public class GenerateSlotsRequestValidator : AbstractValidator<GenerateSlotsRequest>
{
    public GenerateSlotsRequestValidator()
    {
        // Reject a missing generation date.
        RuleFor(x => x.Date).NotEmpty();
    }
}