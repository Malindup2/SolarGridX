using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentValidation;
using MicrogridApi.Common;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    // Identity of the signed-in caller, read from the JWT.
    protected string? CallerId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

    protected string? CallerRole => User.FindFirstValue(ClaimTypes.Role);

    protected string? CallerNic => User.FindFirstValue("nic");

    protected static async Task<Error?> ValidateAsync<T>(IValidator<T> validator, T instance)
    {
        var result = await validator.ValidateAsync(instance);
        if (result.IsValid)
        {
            return null;
        }

        return Error.Validation(
            "VALIDATION_FAILED",
            "One or more validation errors occurred.",
            result.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}").ToArray());
    }

    protected IActionResult ToErrorResponse(Error error) =>
        StatusCode(StatusFor(error.Type), new ErrorResponse(error.Code, error.Message, error.Details));

    protected IActionResult ToResponse(Result result, Func<IActionResult> onSuccess) =>
        result.IsSuccess ? onSuccess() : ToErrorResponse(result.Error!);

    protected IActionResult ToResponse<T>(Result<T> result, Func<T, IActionResult> onSuccess) =>
        result.IsSuccess ? onSuccess(result.Value) : ToErrorResponse(result.Error!);

    private static int StatusFor(ErrorType type) => type switch
    {
        ErrorType.Validation => StatusCodes.Status400BadRequest,
        ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
        ErrorType.Forbidden => StatusCodes.Status403Forbidden,
        ErrorType.NotFound => StatusCodes.Status404NotFound,
        ErrorType.Conflict => StatusCodes.Status409Conflict,
        _ => StatusCodes.Status500InternalServerError
    };
}
