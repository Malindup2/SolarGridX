using System.Globalization;
using MicrogridApi.Common;
using MicrogridApi.Configuration;
using MicrogridApi.DTOs.Qr;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using Microsoft.Extensions.Options;

namespace MicrogridApi.Services;

public class QrVerificationService(
    ReservationRepository reservationRepository,
    StationRepository stationRepository,
    UserRepository userRepository,
    IOptions<QrSettings> qrSettings)
{
    private readonly QrSettings _settings = qrSettings.Value;

    public async Task<Result<QrVerifyResponse>> VerifyAsync(QrVerifyRequest request, string? operatorName)
    {
        var payload = QrTokenCodec.TryDecode(request.QrToken);
        if (payload is null)
        {
            return QrErrors.TokenMalformed;
        }

        // A tampered payload fails here before anything is read from the database.
        if (!QrTokenCodec.SignatureMatches(_settings.HmacSecret, payload))
        {
            return QrErrors.SignatureInvalid;
        }

        if (!DateTime.TryParse(payload.Exp, null, DateTimeStyles.RoundtripKind, out var expiresAt))
        {
            return QrErrors.TokenMalformed;
        }

        // BR-08: the token stops working at the end of its reserved slot.
        if (expiresAt <= DateTime.UtcNow)
        {
            return QrErrors.TokenExpired(expiresAt);
        }

        // The operator must be scanning at the node the token was issued for.
        if (!string.IsNullOrWhiteSpace(request.StationId) &&
            !string.Equals(request.StationId, payload.StationId, StringComparison.Ordinal))
        {
            return QrErrors.TokenStationMismatch;
        }

        if (!ObjectIds.IsValid(payload.ResId))
        {
            return QrErrors.TokenMalformed;
        }

        var reservation = await reservationRepository.FindByIdAsync(payload.ResId);
        if (reservation is null)
        {
            return QrErrors.ReservationNotFound;
        }

        // BR-08: single use. A completed transfer cannot be replayed.
        if (reservation.Status == ReservationStatus.Completed)
        {
            return QrErrors.TokenAlreadyUsed;
        }

        if (reservation.Status != ReservationStatus.Approved)
        {
            return QrErrors.ReservationNotTransferable(reservation.Status.ToString());
        }

        // A reissued token replaces the old one; an older copy is refused.
        if (!string.Equals(reservation.QrToken, request.QrToken, StringComparison.Ordinal))
        {
            return QrErrors.TokenSupersededError;
        }

        var completedAt = DateTime.UtcNow;

        reservation.Status = ReservationStatus.Completed;
        reservation.CompletedAt = completedAt;
        reservation.UpdatedAt = completedAt;

        await reservationRepository.ReplaceAsync(reservation);

        var station = await stationRepository.FindByIdAsync(reservation.StationId);
        var prosumer = await userRepository.FindProsumerByNicAsync(reservation.Nic);

        return new QrVerifyResponse(
            true,
            reservation.Id,
            prosumer?.FullName ?? string.Empty,
            reservation.Nic,
            reservation.StationId,
            station?.StationName ?? string.Empty,
            reservation.EnergyKwh,
            $"{reservation.ReservationDate:yyyy-MM-dd} {reservation.StartTime}-{reservation.EndTime}",
            reservation.Status.ToString(),
            completedAt);
    }
}
