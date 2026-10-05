/*
 * AuthService.cs
 * Applies authentication, registration, password-change, and sign-out rules.
 */
 
using MicrogridApi.Common;
using MicrogridApi.DTOs.Auth;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using MongoDB.Driver;

namespace MicrogridApi.Services;

public class AuthService(
    UserRepository userRepository,
    RevokedTokenRepository revokedTokenRepository,
    JwtTokenService jwtTokenService,
    EmailService emailService,
    ActivityService activityService)
{
    public async Task<Result<LoginResponse>> LoginAsync(LoginRequest request, ClientType client)
    {
        var user = await userRepository.FindByEmailAsync(NormalizeEmail(request.Email));

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return AuthErrors.InvalidCredentials;
        }

        if (!IsRoleAllowedOn(client, user.Role))
        {
            return AuthErrors.RoleNotAllowedOnClient(user.Role);
        }

        if (user.Status == UserStatus.Deactivated)
        {
            return AuthErrors.AccountNotActive(user.Status);
        }

        if (user.Role != Role.Prosumer && user.Status != UserStatus.Active)
        {
            return AuthErrors.AccountNotActive(user.Status);
        }

        return ToLoginResponse(user);
    }

    private LoginResponse ToLoginResponse(User user)
    {
        var token = jwtTokenService.GenerateToken(user);

        return new LoginResponse(
            Token: token,
            Role: user.Role.ToString(),
            Nic: user.Nic,
            DisplayName: user.FullName,
            HomeRoute: HomeRouteFor(user.Role),
            Status: user.Status.ToString(),
            MustChangePassword: user.MustChangePassword);
    }

    public async Task<Result> RegisterAsync(RegisterRequest request)
    {
        var email = NormalizeEmail(request.Email);

        if (await userRepository.ExistsByNicAsync(request.Nic))
        {
            return AuthErrors.NicAlreadyRegistered;
        }

        if (await userRepository.ExistsByEmailAsync(email))
        {
            return AuthErrors.EmailAlreadyRegistered;
        }

        var user = new User
        {
            Nic = request.Nic,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Email = email,
            Phone = request.Phone,
            Address = request.Address,
            Role = Role.Prosumer,
            Status = UserStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            await userRepository.CreateAsync(user);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            return ex.WriteError.Message.Contains("Email_1")
                ? AuthErrors.EmailAlreadyRegistered
                : AuthErrors.NicAlreadyRegistered;
        }

        await emailService.SendRegistrationSuccessEmailAsync(user.Email!, user.FullName);

        await activityService.RecordAsync(
            AuditKinds.Users, user.Id, "AccountRegistered",
            $"New prosumer registration: {user.FullName} ({user.Nic}) is waiting for activation.",
            NotificationCategory.Account, ActivityActions.Prosumer,
            Recipients.ForRole(Role.Backoffice), resourceId: user.Nic);

        return Result.Success();
    }

    // Changing the password signs out every other device (SecurityVersion goes up), so the
    // caller gets a fresh session in the response instead of being signed out as well.
    public async Task<Result<LoginResponse>> ChangePasswordAsync(string? userId, ChangePasswordRequest request)
    {
        var user = string.IsNullOrEmpty(userId) ? null : await userRepository.FindByIdAsync(userId);

        if (user is null)
        {
            return AuthErrors.InvalidToken;
        }

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return AuthErrors.InvalidCurrentPassword;
        }

        if (request.CurrentPassword == request.NewPassword)
        {
            return AuthErrors.PasswordUnchanged;
        }

        await userRepository.ReplacePasswordAsync(user.Id, BCrypt.Net.BCrypt.HashPassword(request.NewPassword));

        await activityService.RecordAsync(
            AuditKinds.Users, user.Id, "PasswordChanged",
            "Your password was changed. Other signed-in devices were signed out.",
            NotificationCategory.Security, ActivityActions.Profile, Recipients.ForUser(user.Id));

        if (!string.IsNullOrEmpty(user.Email))
        {
            await emailService.SendPasswordChangedAsync(user.Email, user.FullName);
        }

        var refreshed = await userRepository.FindByIdAsync(user.Id);
        return ToLoginResponse(refreshed!);
    }

    public async Task<Result> LogoutAsync(string? tokenId, DateTime expiresAtUtc)
    {
        if (string.IsNullOrEmpty(tokenId))
        {
            return AuthErrors.InvalidToken;
        }

        await revokedTokenRepository.RevokeAsync(tokenId, expiresAtUtc);
        return Result.Success();
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static bool IsRoleAllowedOn(ClientType client, Role role) => client switch
    {
        ClientType.Web => role is Role.Backoffice or Role.GridOperator,
        ClientType.Mobile => role is Role.Prosumer or Role.GridOperator,
        _ => true
    };

    private static string HomeRouteFor(Role role) => role switch
    {
        Role.Backoffice => "/backoffice/dashboard",
        Role.GridOperator => "/operator/home",
        Role.Prosumer => "/prosumer/home",
        _ => "/"
    };
}
