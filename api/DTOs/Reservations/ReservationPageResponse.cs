/*
 * ReservationPageResponse.cs
 * Defines a page of reservation results with pagination information and the total record count.
 */
namespace MicrogridApi.DTOs.Reservations;

// One page of a booking view. `Total` counts every match, so clients can show "page 2 of 5".
public record ReservationPageResponse(
    List<ReservationResponse> Items,
    int Page,
    int PageSize,
    int Total);
