/*
 * LoginRequest.cs
 * Defines the email and password a user signs in with.
 */

namespace MicrogridApi.DTOs.Auth;

public record LoginRequest(string Email, string Password);
