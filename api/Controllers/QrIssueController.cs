using MicrogridApi.Common;
using MicrogridApi.DTOs.Qr;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

[Route("api/qr")]
[Authorize]
public class QrIssueController(QrIssueService qrIssueService) : ApiControllerBase
{
    [HttpPost("issue/{reservationId}")]
    [Authorize(Roles = RoleNames.GridOperator)]
    [ProducesResponseType(typeof(QrTokenResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Issue(string reservationId)
    {
        var result = await qrIssueService.IssueAsync(reservationId);
        return ToResponse(result, response => StatusCode(StatusCodes.Status201Created, response));
    }

    [HttpGet("{reservationId}")]
    // README's Section 10.7 restricts this to Prosumer. Since you likely
    // don't have a prosumer test account yet, you can temporarily relax this
    // to [Authorize] (any authenticated role) while testing, then tighten it
    // back before you finish this endpoint.
    [Authorize(Roles = RoleNames.Prosumer)]
    [ProducesResponseType(typeof(QrTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string reservationId)
    {
        var result = await qrIssueService.GetAsync(reservationId);
        return ToResponse(result, response => Ok(response));
    }
}