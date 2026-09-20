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

    public static Error AccountNotActive(UserStatus status) =>
        Error.Forbidden("ACCOUNT_NOT_ACTIVE", $"Account is {status}.");
}
