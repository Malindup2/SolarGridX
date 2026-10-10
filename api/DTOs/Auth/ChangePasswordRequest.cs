/*
 * ChangePasswordRequest.cs
 * Defines the current and new password a signed-in user sends to change their password.
 */

namespace MicrogridApi.DTOs.Auth;

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
