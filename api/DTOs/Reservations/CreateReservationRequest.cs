/*
 * CreateReservationRequest.cs
 * Defines the prosumer, station, slot, schedule, and energy details required to create a reservation.
 */
namespace MicrogridApi.DTOs.Reservations;

public record CreateReservationRequest(
    string Nic,
    string StationId,
    string SlotId,
    DateTime ReservationDate,
    string StartTime,
    string EndTime,
    double EnergyKwh);
