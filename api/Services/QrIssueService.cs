using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
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

    public async Task<Result<QrTokenResponse>> IssueAsync(string reservationId)
    {
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

        var token = BuildToken(reservation.Id, reservation.Nic, reservation.StationId, issuedAt, expiresAt);

        await reservationRepository.SetQrTokenAsync(reservation.Id, token);

        return new QrTokenResponse(reservation.Id, token, expiresAt);
    }

    public async Task<Result<QrTokenResponse>> GetAsync(string reservationId)
    {
        var reservation = await reservationRepository.FindByIdAsync(reservationId);
        if (reservation is null)
        {
            return QrErrors.ReservationNotFound;
        }

        if (string.IsNullOrEmpty(reservation.QrToken))
        {
            return QrErrors.QrNotIssued;
        }

        var payload = DecodeToken(reservation.QrToken);
        var expiresAt = DateTime.Parse(payload.Exp, null, DateTimeStyles.RoundtripKind);

        return new QrTokenResponse(reservation.Id, reservation.QrToken, expiresAt);
    }

    // ---------- QR token building and signing ----------

    private string BuildToken(string resId, string nic, string stationId, DateTime issuedAt, DateTime expiresAt)
    {
        var issuedAtIso = issuedAt.ToString("o");   // ISO-8601 round-trip format
        var expIso = expiresAt.ToString("o");

        var signature = ComputeSignature(resId, nic, stationId, issuedAtIso, expIso);

        var payload = new QrPayload(resId, nic, stationId, issuedAtIso, expIso, signature);
        var payloadJson = JsonSerializer.Serialize(payload);

        // The whole JSON object becomes one compact string — this string is
        // what gets stored, returned to the client, and turned into the
        // scannable QR image on the mobile side.
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(payloadJson));
    }

    private QrPayload DecodeToken(string token)
    {
        var json = Encoding.UTF8.GetString(Convert.FromBase64String(token));
        return JsonSerializer.Deserialize<QrPayload>(json)
            ?? throw new InvalidOperationException("Stored QR token could not be decoded.");
    }

    private string ComputeSignature(string resId, string nic, string stationId, string issuedAtIso, string expIso)
    {
        var signingString = $"{resId}|{nic}|{stationId}|{issuedAtIso}|{expIso}";
        var keyBytes = Encoding.UTF8.GetBytes(_settings.HmacSecret);
        var messageBytes = Encoding.UTF8.GetBytes(signingString);

        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(messageBytes);
        return Convert.ToBase64String(hash);
    }

    private static DateTime CombineDateAndTime(DateTime date, string time)
    {
        var parts = time.Split(':');
        var hour = int.Parse(parts[0], CultureInfo.InvariantCulture);
        var minute = int.Parse(parts[1], CultureInfo.InvariantCulture);
        return new DateTime(date.Year, date.Month, date.Day, hour, minute, 0, DateTimeKind.Utc);
    }

    private record QrPayload(
        [property: JsonPropertyName("resId")] string ResId,
        [property: JsonPropertyName("nic")] string Nic,
        [property: JsonPropertyName("stationId")] string StationId,
        [property: JsonPropertyName("issuedAt")] string IssuedAt,
        [property: JsonPropertyName("exp")] string Exp,
        [property: JsonPropertyName("sig")] string Sig);
}