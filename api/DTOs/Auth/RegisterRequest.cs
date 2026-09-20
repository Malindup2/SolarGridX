namespace MicrogridApi.DTOs.Auth;

public record RegisterRequest(
    string Nic,
    string Password,
    string FullName,
    string Email,
    string? Phone,
    string? Address);
