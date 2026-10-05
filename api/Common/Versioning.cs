namespace MicrogridApi.Common;

// Edit-conflict detection: a client may send the `updatedAt` it last saw. MongoDB stores
// milliseconds, JSON may carry more digits, so the comparison is to the millisecond.
public static class Versioning
{
    public static bool IsStale(DateTime? expected, DateTime stored) =>
        expected.HasValue && ToMillis(expected.Value) != ToMillis(stored);

    private static long ToMillis(DateTime value) =>
        new DateTimeOffset(DateTime.SpecifyKind(value, value.Kind == DateTimeKind.Unspecified ? DateTimeKind.Utc : value.Kind))
            .ToUnixTimeMilliseconds();
}
