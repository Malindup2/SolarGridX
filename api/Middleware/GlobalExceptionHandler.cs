using MicrogridApi.Common;
using Microsoft.AspNetCore.Diagnostics;

namespace MicrogridApi.Middleware;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, code, message, details) = exception switch
        {
            ApiException apiException => (apiException.StatusCode, apiException.Code, apiException.Message, apiException.Details),
            _ => (StatusCodes.Status500InternalServerError, "INTERNAL_ERROR", "An unexpected error occurred.", null)
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Unhandled exception");
        }

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(new ErrorResponse(code, message, details), JsonDefaults.CamelCase, cancellationToken);
        return true;
    }
}
