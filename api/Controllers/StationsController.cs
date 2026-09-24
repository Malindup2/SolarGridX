/*
 * StationsController.cs
 * Handles station HTTP requests and returns the service results to clients.
 */

using MicrogridApi.Common;
using MicrogridApi.DTOs.Stations;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

[Route("api/stations")]
public sealed class StationsController(StationService stationService)
    : ApiControllerBase
{
    [HttpPost]
    [Authorize(Roles = RoleNames.Backoffice)]
    [ProducesResponseType(typeof(StationResponse),
        StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Create(CreateStationRequest request)
    {
        // service will validate and save; 
        var result = await stationService.CreateAsync(request);
        return ToResponse(result, station =>
            StatusCode(StatusCodes.Status201Created, station));
    }
}