using System.Globalization;
using MicrogridApi.Common;
using MicrogridApi.Configuration;
using MicrogridApi.DTOs.Qr;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using Microsoft.Extensions.Options;

namespace MicrogridApi.Services;

public class QrIssueService(ReservationRepository reservationRepository, IOptions<QrSettings> qrSettings)
{
    private readonly QrSettings _settings = qrSettings.Value;

    // Mints and stores the token for an approved reservation.
    public async Task<Result<QrTokenResponse>> IssueAsync(string reservationId)
    {
        if (!ObjectIds.IsValid(reservationId))
        {
            return QrErrors.ReservationNotFound;
        }

        var reservation = await reservationRepository.FindByIdAsync(reservationId);
        if (reservation is null)
        {
            return QrErrors.ReservationNotFound;
        }

        // BR-07: only an Approved reservation may receive a QR code.
        if (reservation.Status != ReservationStatus.Approved)
        {
            return QrErrors.ReservationNotApproved;
        }

        var issuedAt = DateTime.UtcNow;
        var expiresAt = CombineDateAndTime(reservation.ReservationDate, reservation.EndTime);

        var issuedAtIso = issuedAt.ToString("o");
        var expIso = expiresAt.ToString("o");

        var signature = QrTokenCodec.ComputeSignature(
            _settings.HmacSecret, reservation.Id, reservation.Nic, reservation.StationId, issuedAtIso, expIso);

        var token = QrTokenCodec.Encode(new QrTokenCodec.QrPayload(
            reservation.Id, reservation.Nic, reservation.StationId, issuedAtIso, expIso, signature));

        await reservationRepository.SetQrTokenAsync(reservation.Id, token);

        return new QrTokenResponse(reservation.Id, token, expiresAt);
    }

    // Returns the token already issued for a reservation. A prosumer may only
    // fetch their own.
    public async Task<Result<QrTokenResponse>> GetAsync(
        string reservationId, string? callerNic, string? callerRole)
    {
        if (!ObjectIds.IsValid(reservationId))
        {
            return QrErrors.ReservationNotFound;
        }

        var reservation = await reservationRepository.FindByIdAsync(reservationId);
        if (reservation is null)
        {
            return QrErrors.ReservationNotFound;
        }

        if (callerRole == RoleNames.Prosumer &&
            !string.Equals(callerNic, reservation.Nic, StringComparison.OrdinalIgnoreCase))
        {
            return QrErrors.NotTokenOwner;
        }

        if (string.IsNullOrEmpty(reservation.QrToken))
        {
            return QrErrors.QrNotIssued;
        }

        var payload = QrTokenCodec.TryDecode(reservation.QrToken);
        if (payload is null)
        {
            return QrErrors.TokenMalformed;
        }

        var expiresAt = DateTime.Parse(payload.Exp, null, DateTimeStyles.RoundtripKind);

        return new QrTokenResponse(reservation.Id, reservation.QrToken, expiresAt);
    }

    // Slot times are stored as "HH:mm" against a UTC date.
    private static DateTime CombineDateAndTime(DateTime date, string time)
    {
        var parts = time.Split(':');
        var hour = int.Parse(parts[0], CultureInfo.InvariantCulture);
        var minute = int.Parse(parts[1], CultureInfo.InvariantCulture);

        return new DateTime(date.Year, date.Month, date.Day, hour, minute, 0, DateTimeKind.Utc);
    }
}
