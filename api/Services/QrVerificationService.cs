/*
 * QrVerificationService.cs
 * Validates QR tokens for preview and securely completes eligible energy transfers.
 */

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
    ActivityService activityService,
    IOptions<QrSettings> qrSettings)
{
    private readonly QrSettings _settings = qrSettings.Value;

    // Read-only: runs every check verify does and shows the operator what they are about to
    // complete. Nothing is written, so a preview can never finalise a transfer by itself.
    public async Task<Result<QrVerifyResponse>> PreviewAsync(QrVerifyRequest request)
    {
        var checkedToken = await ValidateAsync(request);
        if (checkedToken.Error is not null)
        {
            return checkedToken.Error;
        }

        return await ToResponseAsync(checkedToken.Reservation!, valid: true, completedAt: null);
    }

    // Verifies the scanned token and finalises the transfer (Approved -> Completed).
    // This stays the only way a reservation reaches Completed.
    public async Task<Result<QrVerifyResponse>> VerifyAsync(QrVerifyRequest request, string? operatorName)
    {
        var checkedToken = await ValidateAsync(request);
        if (checkedToken.Error is not null)
        {
            return checkedToken.Error;
        }

        var reservation = checkedToken.Reservation!;
        var completedAt = DateTime.UtcNow;

        // One atomic "Approved -> Completed" update. If two scans race, exactly one wins and the
        // other is told the code was already used, so a transfer can never be completed twice.
        if (!await reservationRepository.TryCompleteAsync(reservation.Id, request.QrToken, completedAt))
        {
            var current = await reservationRepository.FindByIdAsync(reservation.Id);
            return current?.Status == ReservationStatus.Completed
                ? QrErrors.TokenAlreadyUsed
                : QrErrors.ReservationNotTransferable(current?.Status.ToString() ?? "missing");
        }

        reservation.Status = ReservationStatus.Completed;
        reservation.CompletedAt = completedAt;
        reservation.UpdatedAt = completedAt;

        var response = await ToResponseAsync(reservation, valid: true, completedAt);

        await activityService.RecordAsync(
            AuditKinds.Reservations, reservation.Id, "ReservationCompleted",
            $"Energy transfer of {reservation.EnergyKwh} kWh at {response.StationName} is complete.",
            NotificationCategory.Reservation, ActivityActions.Reservation,
            Recipients.ForProsumer(reservation.Nic));

        return response;
    }

    // The checks shared by preview and verify, in the order a client should see them fail.
    private async Task<(EnergyReservation? Reservation, Error? Error)> ValidateAsync(QrVerifyRequest request)
    {
        var payload = QrTokenCodec.TryDecode(request.QrToken);
        if (payload is null)
        {
            return (null, QrErrors.TokenMalformed);
        }

        // A tampered payload fails here before anything is read from the database.
        if (!QrTokenCodec.SignatureMatches(_settings.HmacSecret, payload))
        {
            return (null, QrErrors.SignatureInvalid);
        }

        if (!DateTime.TryParse(payload.Exp, null, DateTimeStyles.RoundtripKind, out var expiresAt))
        {
            return (null, QrErrors.TokenMalformed);
        }

        // BR-08: the token stops working at the end of its reserved slot.
        if (expiresAt <= DateTime.UtcNow)
        {
            return (null, QrErrors.TokenExpired(expiresAt));
        }

        // The operator must be scanning at the node the token was issued for.
        if (!string.IsNullOrWhiteSpace(request.StationId) &&
            !string.Equals(request.StationId, payload.StationId, StringComparison.Ordinal))
        {
            return (null, QrErrors.TokenStationMismatch);
        }

        if (!ObjectIds.IsValid(payload.ResId))
        {
            return (null, QrErrors.TokenMalformed);
        }

        var reservation = await reservationRepository.FindByIdAsync(payload.ResId);
        if (reservation is null)
        {
            return (null, QrErrors.ReservationNotFound);
        }

        // BR-08: single use. A completed transfer cannot be replayed.
        if (reservation.Status == ReservationStatus.Completed)
        {
            return (null, QrErrors.TokenAlreadyUsed);
        }

        if (reservation.Status != ReservationStatus.Approved)
        {
            return (null, QrErrors.ReservationNotTransferable(reservation.Status.ToString()));
        }

        // A reissued token replaces the old one; an older copy is refused.
        if (!string.Equals(reservation.QrToken, request.QrToken, StringComparison.Ordinal))
        {
            return (null, QrErrors.TokenSupersededError);
        }

        // BR-33: the code only works from the moment its slot starts.
        var startsAt = ReservationViewService.StartsAt(reservation);
        if (startsAt > BusinessClock.Now)
        {
            return (null, QrErrors.TokenNotYetValid(startsAt));
        }

        return (reservation, null);
    }

    private async Task<QrVerifyResponse> ToResponseAsync(EnergyReservation reservation, bool valid, DateTime? completedAt)
    {
        var station = await stationRepository.FindByIdAsync(reservation.StationId);
        var prosumer = await userRepository.FindProsumerByNicAsync(reservation.Nic);

        return new QrVerifyResponse(
            valid,
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
