namespace MicrogridApi.DTOs.Reservations;

public record CreateReservationRequest(
    string Nic,
    string StationId,
    string SlotId,
    DateTime ReservationDate,
    string StartTime,
    string EndTime,
    double EnergyKwh);
