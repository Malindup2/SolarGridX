/*
 * QrVerificationController.cs
 * Handles QR token preview and verification requests for energy transfer completion.
 */

using FluentValidation;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Qr;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

[Route("api/qr")]
[Authorize]
public class QrVerificationController(
    QrVerificationService qrVerificationService,
    IValidator<QrVerifyRequest> verifyValidator) : ApiControllerBase
{
    // Read-only check of a scanned token: shows the operator the booking before they confirm.
    // Never completes anything; POST /qr/verify does that.
    [HttpPost("preview")]
    [Authorize(Roles = RoleNames.GridOperator)]
    [ProducesResponseType(typeof(QrVerifyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Preview(QrVerifyRequest request)
    {
        var invalid = await ValidateAsync(verifyValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await qrVerificationService.PreviewAsync(request);
        return ToResponse(result, preview => Ok(preview));
    }

    // Verifies a scanned token and finalises the energy transfer (BR-08).
    [HttpPost("verify")]
    [Authorize(Roles = RoleNames.GridOperator)]
    [ProducesResponseType(typeof(QrVerifyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Verify(QrVerifyRequest request)
    {
        var invalid = await ValidateAsync(verifyValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await qrVerificationService.VerifyAsync(request, CallerName);
        return ToResponse(result, verification => Ok(verification));
    }
}
