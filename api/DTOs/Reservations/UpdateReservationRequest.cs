/*
 * UpdateReservationRequest.cs
 * Defines the requested energy change and optional version check for a reservation update.
 */
namespace MicrogridApi.DTOs.Reservations;

/// <param name="ExpectedUpdatedAt">
/// Optional. The `updatedAt` the client last saw. If the reservation changed since, the
/// request fails with RESERVATION_CHANGED instead of silently overwriting the other change.
/// </param>
public record UpdateReservationRequest(double EnergyKwh, DateTime? ExpectedUpdatedAt = null);
