using MicrogridApi.Common;

namespace MicrogridApi.Services;

public static class QrErrors
{
    public static readonly Error ReservationNotFound =
        Error.NotFound("RESERVATION_NOT_FOUND", "No reservation was found with the given id.");

    public static readonly Error ReservationNotApproved =
        Error.Conflict("RESERVATION_NOT_APPROVED", "A QR code can only be issued for a reservation that has been approved.");

    public static readonly Error QrNotIssued =
        Error.NotFound("QR_NOT_ISSUED", "No QR code has been issued for this reservation yet.");

    public static readonly Error NotTokenOwner =
        Error.Forbidden("NOT_TOKEN_OWNER", "This QR code belongs to another prosumer.");

    // ---------- Verification (BR-08) ----------

    public static readonly Error TokenMalformed =
        Error.Validation("QR_TOKEN_MALFORMED", "The scanned code is not a valid SolarGridX transaction token.");

    public static readonly Error SignatureInvalid =
        Error.Validation("QR_SIGNATURE_INVALID", "The scanned code has been altered and cannot be trusted.");

    public static Error TokenExpired(DateTime expiredAt) =>
        Error.Validation(
            "QR_TOKEN_EXPIRED",
            "This QR code expired at the end of its reserved slot.",
            [$"exp: expired at {BusinessClock.FromUtc(expiredAt):yyyy-MM-dd HH:mm} {BusinessClock.ZoneName}"]);

    public static readonly Error TokenAlreadyUsed =
        Error.Conflict("QR_TOKEN_ALREADY_USED", "This QR code has already been used to finalise an energy transfer.");

    public static Error ReservationNotTransferable(string status) =>
        Error.Conflict(
            "RESERVATION_NOT_TRANSFERABLE",
            $"A {status} reservation cannot be finalised at the node.");

    // BR-33: a code only works from the moment its slot starts.
    public static Error TokenNotYetValid(DateTime startsAt) =>
        new Error(
            "QR_TOKEN_NOT_YET_VALID",
            "This QR code cannot be used before its slot starts.",
            ErrorType.Conflict,
            [$"slot starts at {startsAt:yyyy-MM-dd HH:mm} {BusinessClock.ZoneName}"]);

    public static readonly Error TokenStationMismatch =
        Error.Validation("QR_STATION_MISMATCH", "This QR code was issued for a different microgrid node.");

    public static readonly Error TokenSupersededError =
        Error.Validation("QR_TOKEN_SUPERSEDED", "A newer QR code has been issued for this reservation.");
}
