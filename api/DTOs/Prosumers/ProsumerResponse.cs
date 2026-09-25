namespace MicrogridApi.DTOs.Prosumers;

public record ProsumerResponse(
    string Nic,
    string FullName,
    string Email,
    string? Phone,
    string? Address,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt);
