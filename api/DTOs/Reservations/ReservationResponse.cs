namespace MicrogridApi.DTOs.Reservations;

public record ReservationResponse(
    string Id,
    string Nic,
    string StationId,
    string StationName,
    string SlotId,
    DateTime ReservationDate,
    string StartTime,
    string EndTime,
    string SlotTime,
    double EnergyKwh,
    string Status,
    bool QrEligible,
    string? ApprovedBy,
    string? RejectionReason,
    DateTime? CompletedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt);
