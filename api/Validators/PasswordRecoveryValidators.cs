/*
 * PasswordRecoveryValidators.cs
 * Checks the forgot-password and reset-password requests.
 */

using FluentValidation;
using MicrogridApi.DTOs.Auth;

namespace MicrogridApi.Validators;

public class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    // Requires a valid email address of at most 254 characters.
    public ForgotPasswordRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
    }
}

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    // Requires the 64-character reset token from the email and a new password of 8 to 100 characters.
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty()
            .Matches("^[0-9a-fA-F]{64}$")
            .WithMessage("The reset link is incomplete. Open it again from the email.");

        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8).MaximumLength(100);
    }
}
