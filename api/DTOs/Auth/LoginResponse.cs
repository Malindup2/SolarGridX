namespace MicrogridApi.DTOs.Auth;

public record LoginResponse(
    string Token,
    string Role, 
    string? Nic,
    string DisplayName,
    string HomeRoute,
    string Status);
