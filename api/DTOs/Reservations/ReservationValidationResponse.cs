/*
 * ReservationValidationResponse.cs
 * Defines the result of checking whether a proposed booking satisfies reservation rules.
 */
namespace MicrogridApi.DTOs.Reservations;

public record ReservationValidationResponse(
    bool Valid,
    string? Code,
    string? Message);
