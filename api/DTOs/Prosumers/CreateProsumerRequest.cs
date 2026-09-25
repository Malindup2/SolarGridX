namespace MicrogridApi.DTOs.Prosumers;

public record CreateProsumerRequest(
    string Nic,
    string FullName,
    string Email,
    string Password,
    string? Phone,
    string? Address);
