/*
 * RegisterRequestValidator.cs
 * Checks the personal details and credentials submitted for prosumer self-registration.
 */

using FluentValidation;
using MicrogridApi.DTOs.Auth;

namespace MicrogridApi.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Nic)
            .NotEmpty()
            .Matches(@"^([0-9]{9}[vVxX]|[0-9]{12})$")
            .WithMessage("NIC must be a valid old (9 digits + V/X) or new (12 digits) format.");

        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}
