namespace MicrogridApi.Common;

public static class RateLimitPolicies
{
    // Sign-in and password endpoints: 10 requests per minute per client IP.
    public const string Auth = "auth";

    public const int AuthPermitLimit = 10;

    public static readonly ErrorResponse TooManyAttempts = new(
        "TOO_MANY_ATTEMPTS",
        "Too many attempts. Wait a minute and try again.",
        null);
}
