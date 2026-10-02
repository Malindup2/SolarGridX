using System.Security.Cryptography;
using System.Text;
using MicrogridApi.Common;
using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using Microsoft.Extensions.Options;

namespace MicrogridApi.Services;

// Forgot / reset password. The emailed token is 32 random bytes; only its SHA-256 is stored,
// it works once, and it expires after 20 minutes.
public class PasswordRecoveryService(
    UserRepository userRepository,
    EmailService emailService,
    ActivityService activityService,
    IOptions<WebSettings> webSettings)
{
    public static readonly TimeSpan TokenLifetime = TimeSpan.FromMinutes(20);
    public static readonly TimeSpan RequestCooldown = TimeSpan.FromMinutes(1);

    public static readonly Error InvalidOrExpired = Error.Validation(
        "RESET_TOKEN_INVALID", "This password reset link is invalid or has expired. Request a new one.");

    // Runs in the background worker. Silently does nothing for unknown, inactive or
    // recently-reset accounts, so the caller can't learn which emails exist.
    public async Task SendResetAsync(string email)
    {
        var user = await userRepository.FindByEmailAsync(email.Trim().ToLowerInvariant());
        if (user is null || user.Status != UserStatus.Active)
        {
            return;
        }

        var now = DateTime.UtcNow;
        if (user.PasswordResetRequestedAt is { } requested && now - requested < RequestCooldown)
        {
            return;
        }

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        await userRepository.SetPasswordResetAsync(user.Id, Hash(token), now.Add(TokenLifetime), now);

        var link = $"{webSettings.Value.BaseUrl.TrimEnd('/')}/reset-password#token={token}";
        await emailService.SendPasswordResetAsync(user.Email!, user.FullName, link, TokenLifetime);
    }

    public async Task<Result> ResetAsync(string token, string newPassword)
    {
        var user = await userRepository.FindByResetTokenHashAsync(Hash(token.Trim().ToUpperInvariant()));

        if (user is null
            || user.Status != UserStatus.Active
            || user.PasswordResetExpiresAt is not { } expiresAt
            || expiresAt <= DateTime.UtcNow)
        {
            return InvalidOrExpired;
        }

        // Clears the token (single use) and bumps SecurityVersion, signing out every device.
        await userRepository.ReplacePasswordAsync(user.Id, BCrypt.Net.BCrypt.HashPassword(newPassword));

        await activityService.RecordAsync(
            AuditKinds.Users, user.Id, "PasswordReset",
            "Your password was reset and every signed-in device was signed out.",
            NotificationCategory.Security, ActivityActions.Profile, Recipients.ForUser(user.Id));

        await emailService.SendPasswordChangedAsync(user.Email!, user.FullName);
        return Result.Success();
    }

    public static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();
}
