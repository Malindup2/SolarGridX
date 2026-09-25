using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;

namespace MicrogridApi.Services;

// Shared mapping so the reservation and dashboard services return the same
// shape for a reservation.
public static class ReservationMapper
{
    public static ReservationResponse ToResponse(EnergyReservation reservation, string stationName) => new(
        reservation.Id,
        reservation.Nic,
        reservation.StationId,
        stationName,
        reservation.SlotId,
        reservation.ReservationDate,
        reservation.StartTime,
        reservation.EndTime,
        $"{reservation.ReservationDate:yyyy-MM-dd} {reservation.StartTime}-{reservation.EndTime}",
        reservation.EnergyKwh,
        reservation.Status.ToString(),
        reservation.Status == ReservationStatus.Approved,
        reservation.ApprovedBy,
        reservation.RejectionReason,
        reservation.CompletedAt,
        reservation.CreatedAt,
        reservation.UpdatedAt);
}
