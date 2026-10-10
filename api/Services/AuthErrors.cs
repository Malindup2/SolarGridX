/*
 * AuthErrors.cs
 * Defines the sign-in, registration, password and token errors returned by the auth endpoints.
 */

using MicrogridApi.Common;
using MicrogridApi.Models;

namespace MicrogridApi.Services;

public static class AuthErrors
{
    public static readonly Error InvalidCredentials =
        Error.Unauthorized("INVALID_CREDENTIALS", "Invalid email or password.");

    public static readonly Error NicAlreadyRegistered =
        Error.Conflict("NIC_ALREADY_REGISTERED", "This NIC is already registered.");

    public static readonly Error EmailAlreadyRegistered =
        Error.Conflict("EMAIL_ALREADY_REGISTERED", "This email is already registered.");

    // Builds the 403 for a role signing in on the wrong client, pointing to the right app.
    public static Error RoleNotAllowedOnClient(Role role) =>
        Error.Forbidden(
            "ROLE_NOT_ALLOWED_ON_CLIENT",
            role == Role.Prosumer
                ? "Solar Prosumer accounts sign in through the SolarGridX mobile app."
                : "Backoffice accounts sign in through the SolarGridX web application.");

    public static readonly Error InvalidToken =
        Error.Unauthorized("INVALID_TOKEN", "The token cannot be used to sign out.");

    public static readonly Error InvalidCurrentPassword =
        Error.Validation("INVALID_CURRENT_PASSWORD", "The current password is incorrect.");

    public static readonly Error PasswordUnchanged =
        Error.Validation("PASSWORD_UNCHANGED", "The new password must be different from the current password.");

    // Builds the 403 for an account that may not sign in in its current status.
    public static Error AccountNotActive(UserStatus status) =>
        Error.Forbidden("ACCOUNT_NOT_ACTIVE", $"Account is {status}.");
}
