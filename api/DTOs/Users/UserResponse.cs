/*
 * UserResponse.cs
 * Defines the web user details returned to API clients. The password is never included.
 */

namespace MicrogridApi.DTOs.Users;

public record UserResponse(
    string Id,
    string FullName,
    string Email,
    string Role,
    string Status,
    string? Nic,
    string? Phone,
    string? Address,
    DateTime CreatedAt);