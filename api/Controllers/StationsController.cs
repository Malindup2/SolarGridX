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


    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(List<StationResponse>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse),
        StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAll()
    {
        // Ask the service for every station and return the resulting list
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
    public async Task<IActionResult> GetNearby(
        [FromQuery] double? lat,
        [FromQuery] double? lng,
        [FromQuery] double? radiusKm)
    {
        // Pass the requested area to the service and return matching stations.
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
    public async Task<IActionResult> GetById(string id)
    {
        // Ask the service for the requested station and return its result.
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
    public async Task<IActionResult> Update(
        string id, UpdateStationRequest request)
    {
        
        var result = await stationService.UpdateAsync(id, request);
        return ToResponse(result, station => Ok(station));
    }

}