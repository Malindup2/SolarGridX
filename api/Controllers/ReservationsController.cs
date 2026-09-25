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
    IValidator<CreateReservationRequest> createValidator) : ApiControllerBase
{
    // Creates a Pending reservation for an available slot.
    [HttpPost]
    [Authorize(Roles = RoleNames.Prosumer)]
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
}
