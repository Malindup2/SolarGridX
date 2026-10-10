/*
 * RescheduleReservationRequest.cs
 * Defines the destination slot and optional version check used when rescheduling a reservation.
 */
namespace MicrogridApi.DTOs.Reservations;

/// <param name="ExpectedUpdatedAt">See UpdateReservationRequest.</param>
public record RescheduleReservationRequest(string SlotId, DateTime? ExpectedUpdatedAt = null);
