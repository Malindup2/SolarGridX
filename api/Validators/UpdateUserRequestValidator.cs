/*
 * UpdateUserRequestValidator.cs
 * Checks the full set of web user details sent on update.
 */

using FluentValidation;
using MicrogridApi.DTOs.Users;

namespace MicrogridApi.Validators;

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    // Requires name, email, a web role and a status of Active or Deactivated; the NIC is optional but must be valid.
    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();

        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(role => role is "Backoffice" or "GridOperator")
            .WithMessage("Role must be Backoffice or GridOperator.");

        RuleFor(x => x.Status)
            .NotEmpty()
            .Must(status => status is "Active" or "Deactivated")
            .WithMessage("Status must be Active or Deactivated.");

        RuleFor(x => x.Nic)
            .Matches(@"^([0-9]{9}[vVxX]|[0-9]{12})$")
            .When(x => !string.IsNullOrWhiteSpace(x.Nic))
            .WithMessage("NIC must be a valid old (9 digits + V/X) or new (12 digits) format.");
    }
}
