using MicrogridApi.DTOs.Reservations;

namespace MicrogridApi.DTOs.Dashboards;

public record OperatorDashboardResponse(
    string StationId,
    string StationName,
    int PendingCount,
    int ApprovedFutureCount,
    List<ReservationResponse> PendingReservations);
