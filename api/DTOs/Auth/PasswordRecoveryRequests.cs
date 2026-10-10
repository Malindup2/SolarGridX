/*
 * PasswordRecoveryRequests.cs
 * Defines the forgot-password and reset-password requests, and the plain message response.
 */

namespace MicrogridApi.DTOs.Auth;

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Token, string NewPassword);

public record MessageResponse(string Message);
