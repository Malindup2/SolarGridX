using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentValidation;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Auth;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

[Route("api/auth")]
public class AuthController(
    AuthService authService,
    IValidator<LoginRequest> loginValidator,
    IValidator<RegisterRequest> registerValidator) : ApiControllerBase
{
    [HttpPost("login")]
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
