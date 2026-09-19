using FluentValidation;
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
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        await ValidateAsync(loginValidator, request);
        var response = await authService.LoginAsync(request);
        return Ok(response);
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        await ValidateAsync(registerValidator, request);
        await authService.RegisterAsync(request);
        return StatusCode(StatusCodes.Status201Created);
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout() => Ok();
}
