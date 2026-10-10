/*
 * CorrelationIdMiddleware.cs
 * Assigns a server-generated correlation ID to each request for response tracking and logging.
 */
 
namespace MicrogridApi.Middleware;

// Gives every request an id that is returned as X-Correlation-ID, written to every log line for
// the request and put in error responses, so a user's "Reference: …" leads straight to the log.
// An incoming header is ignored on purpose: clients cannot choose or forge the id.
public class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
{
    public const string HeaderName = "X-Correlation-ID";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        context.TraceIdentifier = correlationId;

        context.Response.OnStarting(() =>
        {
            context.Response.Headers[HeaderName] = correlationId;
            return Task.CompletedTask;
        });

        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            await next(context);
        }
    }
}
