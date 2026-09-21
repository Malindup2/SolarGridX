namespace MicrogridApi.DTOs.Users;

public record CreateUserRequest(
    string FullName,
    string Email,
    string Password,
    string Role,
    string? Nic,
    string? Phone,
    string? Address);
