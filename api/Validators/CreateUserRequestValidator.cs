/*
 * CreateUserRequestValidator.cs
 * Checks the details of a new web user before it is created.
 */

using FluentValidation;
using MicrogridApi.DTOs.Users;

namespace MicrogridApi.Validators;

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    // Requires name, email, an 8+ character password and a web role; the NIC is optional but must be valid.
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);

        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(role => role is "Backoffice" or "GridOperator")
            .WithMessage("Role must be Backoffice or GridOperator. Prosumers register through the mobile app.");

        RuleFor(x => x.Nic)
            .Matches(@"^([0-9]{9}[vVxX]|[0-9]{12})$")
            .When(x => !string.IsNullOrWhiteSpace(x.Nic))
            .WithMessage("NIC must be a valid old (9 digits + V/X) or new (12 digits) format.");
    }
}
