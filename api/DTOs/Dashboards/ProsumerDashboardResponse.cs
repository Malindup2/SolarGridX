/*
 * ProsumerDashboardResponse.cs
 * Defines the booking statistics returned for a prosumer dashboard.
 */
namespace MicrogridApi.DTOs.Dashboards;

public record ProsumerDashboardResponse(
    string Nic,
    int ActiveCount,
    int PendingCount,
    int ApprovedFutureCount);
