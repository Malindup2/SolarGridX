/*
 * LoginResponse.cs
 * Defines the session returned after sign-in: the token, role, status, home route and
 * whether the user must change their password first.
 */

namespace MicrogridApi.DTOs.Auth;

public record LoginResponse(
    string Token,
    string Role, 
    string? Nic,
    string DisplayName,
    string HomeRoute,
    string Status,
    bool MustChangePassword);
