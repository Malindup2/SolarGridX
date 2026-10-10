/*
 * CreateUserRequest.cs
 * Defines the details a Backoffice user sends to create a web user (Backoffice or Grid Operator).
 */

namespace MicrogridApi.DTOs.Users;

public record CreateUserRequest(
    string FullName,
    string Email,
    string Password,
    string Role,
    string? Nic,
    string? Phone,
    string? Address);
