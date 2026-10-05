/*
 * UserResponse.cs
 * Defines the user account details returned to API clients.
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
