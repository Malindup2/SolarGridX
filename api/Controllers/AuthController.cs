using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentValidation;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Auth;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace MicrogridApi.Controllers;

[Route("api/auth")]
public class AuthController(
    AuthService authService,
    PasswordRecoveryService passwordRecoveryService,
    PasswordRecoveryQueue passwordRecoveryQueue,
    IValidator<LoginRequest> loginValidator,
    IValidator<RegisterRequest> registerValidator,
    IValidator<ChangePasswordRequest> changePasswordValidator,
    IValidator<ForgotPasswordRequest> forgotValidator,
    IValidator<ResetPasswordRequest> resetValidator) : ApiControllerBase
{
    public const string ForgotPasswordMessage =
        "If an active SolarGridX account uses that email, a password reset link is on its way.";

    [HttpPost("login")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Login(LoginRequest request, [FromHeader(Name = ClientTypes.HeaderName)] string? clientType)
    {
        var invalid = await ValidateAsync(loginValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await authService.LoginAsync(request, ClientTypes.Parse(clientType));
        return ToResponse(result, response => Ok(response));
    }

    [HttpPost("register")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var invalid = await ValidateAsync(registerValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await authService.RegisterAsync(request);
        return ToResponse(result, () => StatusCode(StatusCodes.Status201Created));
    }

    [HttpPost("change-password")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [Authorize]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var invalid = await ValidateAsync(changePasswordValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        var result = await authService.ChangePasswordAsync(userId, request);
        return ToResponse(result, session => Ok(session));
    }

    // Always the same answer, whether or not the email belongs to an account. The reset email
    // is sent from a background queue so the response time gives nothing away either.
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var invalid = await ValidateAsync(forgotValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        if (!passwordRecoveryQueue.TryEnqueue(request.Email))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, RateLimitPolicies.TooManyAttempts);
        }

        return Ok(new MessageResponse(ForgotPasswordMessage));
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var invalid = await ValidateAsync(resetValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await passwordRecoveryService.ResetAsync(request.Token, request.NewPassword);
        return ToResponse(result, () => Ok(new MessageResponse("Your password has been reset. Sign in with the new password.")));
    }

    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout()
    {
        var tokenId = User.FindFirstValue(JwtRegisteredClaimNames.Jti);
        var expiresAt = long.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Exp), out var seconds)
            ? DateTimeOffset.FromUnixTimeSeconds(seconds).UtcDateTime
            : DateTime.UtcNow.AddHours(24);

        var result = await authService.LogoutAsync(tokenId, expiresAt);
        return ToResponse(result, () => Ok());
    }
}
