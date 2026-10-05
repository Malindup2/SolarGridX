/*
 * CreateProsumerRequestValidator.cs
 * Checks the prosumer details before a Backoffice user creates a prosumer account.
 */
 
using FluentValidation;
using MicrogridApi.DTOs.Prosumers;

namespace MicrogridApi.Validators;

public class CreateProsumerRequestValidator : AbstractValidator<CreateProsumerRequest>
{
    // Requires a valid Sri Lankan NIC (old or new format), name, email and an 8+ character password.
    public CreateProsumerRequestValidator()
    {
        RuleFor(x => x.Nic)
            .NotEmpty()
            .Matches(@"^([0-9]{9}[vVxX]|[0-9]{12})$")
            .WithMessage("NIC must be a valid old (9 digits + V/X) or new (12 digits) format.");

        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
    }
}
