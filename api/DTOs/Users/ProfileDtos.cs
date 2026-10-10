/*
 * ProfileDtos.cs
 * Defines the signed-in user's own profile response and the profile update request.
 */

namespace MicrogridApi.DTOs.Users;

// The signed-in user's own account, for every role.
public record ProfileResponse(
    string Id,
    string FullName,
    string Email,
    string? Phone,
    string? Address,
    string? Nic,
    string Role,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    // Changes whenever the photo changes, so clients can cache-bust; null when there is none.
    string? AvatarVersion);

public record UpdateProfileRequest(string FullName, string Email, string? Phone, string? Address);
