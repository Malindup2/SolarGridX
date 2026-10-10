/*
 * SlotController.cs
 * Handles booking slot HTTP requests and returns the service results to clients.
 */

using FluentValidation;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Slots;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

[Route("api")]
[Authorize]
public class SlotController(
    SlotService slotService,
    IValidator<CreateSlotRequest> createValidator,
    IValidator<GenerateSlotsRequest> generateValidator,
    IValidator<UpdateSlotRequest> updateValidator,
    IValidator<BulkAvailabilityRequest> bulkAvailabilityValidator) : ApiControllerBase
{
    [HttpPost("stations/{stationId}/slots")]
    [Authorize(Roles = RoleNames.GridOperator)]
    [ProducesResponseType(typeof(SlotResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(string stationId, CreateSlotRequest request)
    {
                // Validate the request, then ask the service to create one manual slot.

        var invalid = await ValidateAsync(createValidator, request);
        if (invalid is not null) return ToErrorResponse(invalid);

        var result = await slotService.CreateAsync(stationId, request);
        return ToResponse(result, slot => StatusCode(StatusCodes.Status201Created, slot));
    }

    [HttpPost("stations/{stationId}/slots/generate")]
    [Authorize(Roles = RoleNames.GridOperator)]
    [ProducesResponseType(typeof(List<SlotResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Generate(string stationId, GenerateSlotsRequest request)
    {
                // Validate the request, then ask the service to generate a day of slots.

        var invalid = await ValidateAsync(generateValidator, request);
        if (invalid is not null) return ToErrorResponse(invalid);

        var result = await slotService.GenerateAsync(stationId, request);
        return ToResponse(result, slots => StatusCode(StatusCodes.Status201Created, slots));
    }

    [HttpGet("stations/{stationId}/slots")]
    [ProducesResponseType(typeof(List<SlotResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByStation(string stationId)
    {
                // Return every slot for the requested station.

        var slots = await slotService.GetByStationAsync(stationId);
        return Ok(slots);
    }

    [HttpGet("slots")]
    [ProducesResponseType(typeof(List<SlotResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] DateTime? date, [FromQuery] bool? available)
    {
                // Return slots filtered by the optional date and availability query params.

        var slots = await slotService.GetAsync(date, available);
        return Ok(slots);
    }

    [HttpPut("slots/{id}")]
    [Authorize(Roles = RoleNames.GridOperator)]
    [ProducesResponseType(typeof(SlotResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(string id, UpdateSlotRequest request)
    {
                // Validate the request, then ask the service to update the slot.

        var invalid = await ValidateAsync(updateValidator, request);
        if (invalid is not null) return ToErrorResponse(invalid);

        var result = await slotService.UpdateAsync(id, request);
        return ToResponse(result, slot => Ok(slot));
    }

    [HttpPatch("slots/{id}/availability")]
    [Authorize(Roles = RoleNames.GridOperator)]
    [ProducesResponseType(typeof(SlotResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetAvailability(string id, SlotAvailabilityRequest request)
    {
                // Ask the service to toggle this slot's availability.

        var result = await slotService.SetAvailabilityAsync(id, request.IsAvailable);
        return ToResponse(result, slot => Ok(slot));
    }

    [HttpPatch("slots/bulk-availability")]
    [Authorize(Roles = RoleNames.GridOperator)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetBulkAvailability(BulkAvailabilityRequest request)
    {
                // Validate the request, then ask the service to toggle several slots at once.

        var invalid = await ValidateAsync(bulkAvailabilityValidator, request);
        if (invalid is not null) return ToErrorResponse(invalid);

        await slotService.SetBulkAvailabilityAsync(request.SlotIds, request.IsAvailable);
        return Ok();
    }

    [HttpDelete("slots/{id}")]
    [Authorize(Roles = RoleNames.GridOperator)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(string id)
    {
                // Ask the service to delete the slot, subject to BR-09.

        var result = await slotService.DeleteAsync(id);
        return ToResponse(result, () => Ok());
    }
}