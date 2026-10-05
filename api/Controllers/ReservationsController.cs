using FluentValidation;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

[Route("api/reservations")]
[Authorize]
public class ReservationsController(
    ReservationService reservationService,
    ReservationViewService reservationViewService,
    IValidator<CreateReservationRequest> createValidator,
    IValidator<UpdateReservationRequest> updateValidator,
    IValidator<RescheduleReservationRequest> rescheduleValidator,
    IValidator<RejectReservationRequest> rejectValidator) : ApiControllerBase
{
    // Creates a Pending reservation for an available slot. A Grid Operator may book on a
    // prosumer's behalf (assisted booking); every reservation rule still applies.
    [HttpPost]
    [Authorize(Roles = $"{RoleNames.Prosumer},{RoleNames.GridOperator}")]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(CreateReservationRequest request)
    {
        var invalid = await ValidateAsync(createValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await reservationService.CreateAsync(request, CallerNic, CallerRole);
        return ToResponse(result, reservation =>
            StatusCode(StatusCodes.Status201Created, reservation));
    }

    // Lists reservations
    [HttpGet]
    [ProducesResponseType(typeof(List<ReservationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> List(
        [FromQuery] string? nic,
        [FromQuery] string? status,
        [FromQuery] string? stationId)
    {
        var result = await reservationService.ListAsync(nic, status, stationId, CallerNic, CallerRole);
        return ToResponse(result, reservations => Ok(reservations));
    }

    // Current / pending / history booking views, paged. A prosumer only sees their own.
    [HttpGet("view/{view}")]
    [ProducesResponseType(typeof(ReservationPageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> View(
        string view,
        [FromQuery] string? nic,
        [FromQuery] string? stationId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await reservationViewService.ViewAsync(view, nic, stationId, page, pageSize, CallerNic, CallerRole);
        return ToResponse(result, pageResult => Ok(pageResult));
    }

    // Pre-flight rule check for a slot, before committing to a booking.
    [HttpGet("validate")]
    [ProducesResponseType(typeof(ReservationValidationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Validate([FromQuery] string slotId)
    {
        var result = await reservationService.ValidateAsync(slotId, CallerNic, CallerRole);
        return ToResponse(result, validation => Ok(validation));
    }

    // Returns a single reservation.
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id)
    {
        var result = await reservationService.GetByIdAsync(id, CallerNic, CallerRole);
        return ToResponse(result, reservation => Ok(reservation));
    }

    // Changes the energy booked on a Pending reservation (BR-02).
    [HttpPut("{id}")]
    [Authorize(Roles = $"{RoleNames.Prosumer},{RoleNames.GridOperator}")]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(string id, UpdateReservationRequest request)
    {
        var invalid = await ValidateAsync(updateValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await reservationService.UpdateAsync(id, request, CallerNic, CallerRole);
        return ToResponse(result, reservation => Ok(reservation));
    }

    // Moves a Pending reservation onto a different slot (BR-01 and BR-02).
    [HttpPatch("{id}/reschedule")]
    [Authorize(Roles = $"{RoleNames.Prosumer},{RoleNames.GridOperator}")]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reschedule(string id, RescheduleReservationRequest request)
    {
        var invalid = await ValidateAsync(rescheduleValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await reservationService.RescheduleAsync(id, request, CallerNic, CallerRole);
        return ToResponse(result, reservation => Ok(reservation));
    }

    // Cancels a reservation and releases its slot
    [HttpPatch("{id}/cancel")]
    [Authorize(Roles = $"{RoleNames.Prosumer},{RoleNames.Backoffice}")]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(string id)
    {
        var result = await reservationService.CancelAsync(id, CallerNic, CallerRole);
        return ToResponse(result, reservation => Ok(reservation));
    }

    // Approves a Pending reservation and issues its QR token (BR-07).
    [HttpPatch("{id}/approve")]
    [Authorize(Roles = RoleNames.GridOperator)]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Approve(string id)
    {
        var result = await reservationService.ApproveAsync(id, CallerName);
        return ToResponse(result, reservation => Ok(reservation));
    }

    // Rejects a Pending reservation with a reason and frees the slot.
    [HttpPatch("{id}/reject")]
    [Authorize(Roles = RoleNames.GridOperator)]
    [ProducesResponseType(typeof(ReservationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reject(string id, RejectReservationRequest request)
    {
        var invalid = await ValidateAsync(rejectValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await reservationService.RejectAsync(id, request, CallerName);
        return ToResponse(result, reservation => Ok(reservation));
    }
}
