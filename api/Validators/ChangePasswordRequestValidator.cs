/*
 * ChangePasswordRequestValidator.cs
 * Checks a password change request before it reaches the service.
 */

using FluentValidation;
using MicrogridApi.DTOs.Auth;

namespace MicrogridApi.Validators;

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    // Requires the current password and a new password of at least 8 characters.
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8);
    }
}
