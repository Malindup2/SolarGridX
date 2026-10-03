/*
 * BusinessClock.cs
 * The system runs on Sri Lanka time (UTC+05:30, no daylight saving). Slot dates and their
 * "HH:mm" start and end times are Sri Lanka wall-clock times, so "has this slot started?" is
 * answered against this clock. Real timestamps (created, approved, token expiry) stay exact
 * UTC instants; ToUtc and FromUtc move between the two.
 */

namespace MicrogridApi.Common;

public static class BusinessClock
{
    public const string ZoneName = "Sri Lanka time";

    private static readonly TimeSpan Offset = TimeSpan.FromHours(5.5);

    // Now as a Sri Lanka wall-clock time (compare it with a slot's date and HH:mm).
    public static DateTime Now => DateTime.SpecifyKind(DateTime.UtcNow + Offset, DateTimeKind.Unspecified);

    public static DateTime Today => Now.Date;

    // A slot's wall-clock time as the exact UTC instant it happens (token expiry).
    public static DateTime ToUtc(DateTime wallClock) =>
        DateTime.SpecifyKind(wallClock - Offset, DateTimeKind.Utc);

    // A UTC instant as Sri Lanka wall-clock time (for messages).
    public static DateTime FromUtc(DateTime utc) =>
        DateTime.SpecifyKind(utc.ToUniversalTime() + Offset, DateTimeKind.Unspecified);
}
