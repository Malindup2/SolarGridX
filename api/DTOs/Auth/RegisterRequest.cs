/*
 * RegisterRequest.cs
 * Defines the details a prosumer sends to register from the mobile app, with NIC as the key.
 */

namespace MicrogridApi.DTOs.Auth;

public record RegisterRequest(
    string Nic,
    string Password,
    string FullName,
    string Email,
    string? Phone,
    string? Address);
