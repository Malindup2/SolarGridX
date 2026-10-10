/*
 * ProsumersController.cs
 * Handles prosumer account requests: list, pending queue, create, view, update,
 * activate (Backoffice only, BR-05) and deactivate. A prosumer is identified by NIC.
 */

using FluentValidation;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Prosumers;
using MicrogridApi.Models;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

[Route("api/prosumers")]
[Authorize]
public class ProsumersController(
    ProsumerService prosumerService,
    IValidator<CreateProsumerRequest> createValidator,
    IValidator<UpdateProsumerRequest> updateValidator) : ApiControllerBase
{
    [HttpGet]
    [Authorize(Roles = $"{RoleNames.Backoffice},{RoleNames.GridOperator}")]
    [ProducesResponseType(typeof(List<ProsumerResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    // Returns prosumers, optionally filtered by status.
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        var result = await prosumerService.ListAsync(status);
        return ToResponse(result, prosumers => Ok(prosumers));
    }

    [HttpGet("pending")]
    [Authorize(Roles = RoleNames.Backoffice)]
    [ProducesResponseType(typeof(List<ProsumerResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    // Returns the activation queue: prosumers still waiting for approval.
    public async Task<IActionResult> Pending()
    {
        var result = await prosumerService.ListAsync(nameof(UserStatus.Pending));
        return ToResponse(result, prosumers => Ok(prosumers));
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.Backoffice)]
    [ProducesResponseType(typeof(ProsumerResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    // Validates and creates an active prosumer from the web admin console.
    public async Task<IActionResult> Create(CreateProsumerRequest request)
    {
        var invalid = await ValidateAsync(createValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await prosumerService.CreateAsync(request);
        return ToResponse(result, prosumer => StatusCode(StatusCodes.Status201Created, prosumer));
    }

    [HttpGet("{nic}")]
    [ProducesResponseType(typeof(ProsumerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    // Returns one prosumer by NIC; a prosumer may only read their own profile.
    public async Task<IActionResult> Get(string nic)
    {
        var result = await prosumerService.GetAsync(nic, CallerId, CallerRole);
        return ToResponse(result, prosumer => Ok(prosumer));
    }

    [HttpPut("{nic}")]
    [Authorize(Roles = $"{RoleNames.Prosumer},{RoleNames.Backoffice}")]
    [ProducesResponseType(typeof(ProsumerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    // Validates and saves a prosumer's profile details.
    public async Task<IActionResult> Update(string nic, UpdateProsumerRequest request)
    {
        var invalid = await ValidateAsync(updateValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await prosumerService.UpdateAsync(nic, request, CallerId, CallerRole);
        return ToResponse(result, prosumer => Ok(prosumer));
    }

    [HttpPatch("{nic}/activate")]
    [Authorize(Roles = RoleNames.Backoffice)]
    [ProducesResponseType(typeof(ProsumerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    // Activates or reactivates a prosumer account (Backoffice only, BR-05).
    public async Task<IActionResult> Activate(string nic)
    {
        var result = await prosumerService.ActivateAsync(nic);
        return ToResponse(result, prosumer => Ok(prosumer));
    }

    [HttpPatch("{nic}/deactivate")]
    [Authorize(Roles = $"{RoleNames.Prosumer},{RoleNames.Backoffice}")]
    [ProducesResponseType(typeof(ProsumerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    // Deactivates a prosumer account, either by the prosumer themselves or by Backoffice.
    public async Task<IActionResult> Deactivate(string nic)
    {
        var result = await prosumerService.DeactivateAsync(nic, CallerId, CallerRole);
        return ToResponse(result, prosumer => Ok(prosumer));
    }
}
