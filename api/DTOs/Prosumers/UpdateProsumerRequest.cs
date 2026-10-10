/*
 * UpdateProsumerRequest.cs
 * Defines the prosumer details that can be edited. NIC and status cannot be changed here.
 */

namespace MicrogridApi.DTOs.Prosumers;

public record UpdateProsumerRequest(
    string FullName,
    string Email,
    string? Phone,
    string? Address);
