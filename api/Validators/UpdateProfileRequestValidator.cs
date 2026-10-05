/*
 * UpdateProfileRequestValidator.cs
 * Checks the editable personal and contact details submitted for a profile update.
 */

using FluentValidation;
using MicrogridApi.DTOs.Users;

namespace MicrogridApi.Validators;

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.Phone).MaximumLength(20);
        RuleFor(x => x.Address).MaximumLength(250);
    }
}
