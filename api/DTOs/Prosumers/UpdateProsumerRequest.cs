namespace MicrogridApi.DTOs.Prosumers;

public record UpdateProsumerRequest(
    string FullName,
    string Email,
    string? Phone,
    string? Address);
