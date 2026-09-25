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
}