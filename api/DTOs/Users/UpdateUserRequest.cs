/*
 * UpdateUserRequest.cs
 * Defines the full set of web user details sent on update, including role and status.
 */

namespace MicrogridApi.DTOs.Users;

public record UpdateUserRequest(
    string FullName,
    string Email,
    string Role,
    string Status,
    string? Nic,
    string? Phone,
    string? Address);
