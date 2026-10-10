/*
 * RejectReservationRequest.cs
 * Defines the reason submitted when rejecting a reservation.
 */
namespace MicrogridApi.DTOs.Reservations;

public record RejectReservationRequest(string Reason);
