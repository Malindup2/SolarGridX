using MicrogridApi.Common;
using Microsoft.AspNetCore.Diagnostics;
using MongoDB.Driver;

namespace MicrogridApi.Middleware;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
        {
            return true;
        }

        var (statusCode, code, message) = exception switch
        {
            MongoConnectionException or TimeoutException => (
                StatusCodes.Status503ServiceUnavailable,
                "SERVICE_UNAVAILABLE",
                "A required service is temporarily unavailable. Please try again shortly."),
            _ => (
                StatusCodes.Status500InternalServerError,
                "INTERNAL_ERROR",
                "An unexpected error occurred.")
        };

        logger.LogError(exception, "Unhandled exception ({Code}) on {Method} {Path}",
            code, httpContext.Request.Method, httpContext.Request.Path);

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(
            new ErrorResponse(code, message, [$"traceId: {httpContext.TraceIdentifier}"]),
            JsonDefaults.CamelCase,
            cancellationToken);
        return true;
    }
}
