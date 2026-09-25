using MicrogridApi.Common;
using MicrogridApi.DTOs.Dashboards;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

// Booking monitor and dashboard reads (README section 10.8).
[Route("api")]
[Authorize]
public class BookingsController(
    ReservationService reservationService,
    DashboardService dashboardService) : ApiControllerBase
{
    // Booking monitor with filter criteria; a prosumer only sees their own.
    [HttpGet("bookings/search")]
    [ProducesResponseType(typeof(List<ReservationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Search(
        [FromQuery] string? nic,
        [FromQuery] string? status,
        [FromQuery] string? stationId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        var result = await reservationService.SearchAsync(
            nic, status, stationId, dateFrom, dateTo, CallerNic, CallerRole);

        return ToResponse(result, reservations => Ok(reservations));
    }

    // Active, pending and approved-future counts for one prosumer.
    [HttpGet("dashboard/prosumer/{nic}")]
    [ProducesResponseType(typeof(ProsumerDashboardResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ProsumerDashboard(string nic)
    {
        var result = await dashboardService.ProsumerAsync(nic, CallerNic, CallerRole);
        return ToResponse(result, dashboard => Ok(dashboard));
    }

    // Pending queue and approved-future count for one microgrid node.
    [HttpGet("dashboard/operator/{stationId}")]
    [Authorize(Roles = $"{RoleNames.GridOperator},{RoleNames.Backoffice}")]
    [ProducesResponseType(typeof(OperatorDashboardResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> OperatorDashboard(string stationId)
    {
        var result = await dashboardService.OperatorAsync(stationId);
        return ToResponse(result, dashboard => Ok(dashboard));
    }
}
