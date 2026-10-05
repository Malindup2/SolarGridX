namespace MicrogridApi.DTOs.Reservations;

/// <param name="ExpectedUpdatedAt">See UpdateReservationRequest.</param>
public record RescheduleReservationRequest(string SlotId, DateTime? ExpectedUpdatedAt = null);
