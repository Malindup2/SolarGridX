/*
 * ReservationsController.cs
 * HTTP surface for the energy reservation lifecycle (README section 10.3).
 * Rules live in ReservationService; this layer checks the request shape and
 * maps results onto status codes.
 */

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
}
