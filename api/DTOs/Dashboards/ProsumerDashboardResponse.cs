namespace MicrogridApi.DTOs.Dashboards;

public record ProsumerDashboardResponse(
    string Nic,
    int ActiveCount,
    int PendingCount,
    int ApprovedFutureCount);
