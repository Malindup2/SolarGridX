/*
 * CreateProsumerRequest.cs
 * Defines the prosumer details a Backoffice user sends to create a prosumer account.
 */

namespace MicrogridApi.DTOs.Prosumers;

public record CreateProsumerRequest(
    string Nic,
    string FullName,
    string Email,
    string Password,
    string? Phone,
    string? Address);
