/*
 * LoginRequestValidator.cs
 * Checks the sign-in details before the credentials are verified.
 */

using FluentValidation;
using MicrogridApi.DTOs.Auth;

namespace MicrogridApi.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    // Requires a valid email address and a password.
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}
