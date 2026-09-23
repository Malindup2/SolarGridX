namespace MicrogridApi.DTOs.Users;

public record UpdateUserRequest(
    string FullName,
    string Email,
    string Role,
    string Status,
    string? Nic,
    string? Phone,
    string? Address);
