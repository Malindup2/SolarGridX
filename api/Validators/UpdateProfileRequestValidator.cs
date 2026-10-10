/*
 * UpdateProfileRequestValidator.cs
 * Checks the details a signed-in user sends to update their own profile.
 */

using FluentValidation;
using MicrogridApi.DTOs.Users;

namespace MicrogridApi.Validators;

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    // Requires a name and valid email, and limits the length of every field.
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.Phone).MaximumLength(20);
        RuleFor(x => x.Address).MaximumLength(250);
    }
}
