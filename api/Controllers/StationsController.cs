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
    // Registers a new station and returns the created record
    public async Task<IActionResult> Create(CreateStationRequest request)
    {

        var result = await stationService.CreateAsync(request);
        return ToResponse(result, station =>
            StatusCode(StatusCodes.Status201Created, station));
    }


    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(List<StationResponse>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status401Unauthorized)]
    // Returns all registered stations.
    public async Task<IActionResult> GetAll()
    {

        var result = await stationService.GetAllAsync();
        return ToResponse(result, stations => Ok(stations));
    }


    [HttpGet("nearby")]
    [Authorize]
    [ProducesResponseType(typeof(List<StationResponse>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status401Unauthorized)]
    // Finds active stations within the requested radius, nearest first.
    public async Task<IActionResult> GetNearby(
        [FromQuery] double? lat,
        [FromQuery] double? lng,
        [FromQuery] double? radiusKm)
    {

        var result = await stationService.GetNearbyAsync(lat, lng, radiusKm);
        return ToResponse(result, stations => Ok(stations));
    }



    [HttpGet("{id}")]
    [Authorize]
    [ProducesResponseType(typeof(StationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status404NotFound)]
    // Returns the station with the requested ID.
    public async Task<IActionResult> GetById(string id)
    {

        var result = await stationService.GetByIdAsync(id);
        return ToResponse(result, station => Ok(station));
    }


    [HttpPut("{id}")]
    [Authorize(Roles = RoleNames.Backoffice)]
    [ProducesResponseType(typeof(StationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status409Conflict)]
    // Updates a station's editable details.
    public async Task<IActionResult> Update(
        string id, UpdateStationRequest request)
    {

        var result = await stationService.UpdateAsync(id, request);
        return ToResponse(result, station => Ok(station));
    }


    [HttpPatch("{id}/schedule")]
    [Authorize(Roles = RoleNames.Backoffice + "," + RoleNames.GridOperator)]
    [ProducesResponseType(typeof(StationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status409Conflict)]
    // Updates a station's operating hours and active days.
    public async Task<IActionResult> UpdateSchedule(
        string id, StationScheduleRequest request)
    {

        var result = await stationService.UpdateScheduleAsync(id, request);
        return ToResponse(result, station => Ok(station));
    }


    [HttpPatch("{id}/activate")]
    [Authorize(Roles = RoleNames.Backoffice)]
    [ProducesResponseType(typeof(StationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status404NotFound)]
    // Activates a station.
    public async Task<IActionResult> Activate(string id)
    {

        var result = await stationService.ActivateAsync(id);
        return ToResponse(result, station => Ok(station));
    }


    [HttpPatch("{id}/deactivate")]
    [Authorize(Roles = RoleNames.Backoffice)]
    [ProducesResponseType(typeof(StationResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status409Conflict)]
    // Deactivates a station if no active reservations block it.
    public async Task<IActionResult> Deactivate(string id)
    {

        var result = await stationService.DeactivateAsync(id);
        return ToResponse(result, station => Ok(station));
    }


    [HttpDelete("{id}")]
    [Authorize(Roles = RoleNames.Backoffice)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status409Conflict)]
    // Deletes a station if no slots or reservations reference it.
    public async Task<IActionResult> Delete(string id)
    {

        var result = await stationService.DeleteAsync(id);
        return ToResponse(result, () => NoContent());
    }

}