using FluentValidation;
using MicrogridApi.Common;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected static async Task ValidateAsync<T>(IValidator<T> validator, T instance)
    {
        var result = await validator.ValidateAsync(instance);
        if (!result.IsValid)
        {
            throw new ApiException(
                "VALIDATION_FAILED",
                "One or more validation errors occurred.",
                StatusCodes.Status400BadRequest,
                result.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}").ToArray());
        }
    }
}
