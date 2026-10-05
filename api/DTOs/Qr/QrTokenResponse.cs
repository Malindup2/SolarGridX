/*
 * QrTokenResponse.cs
 * Defines the token details returned after issuing or retrieving a QR code.
 */


namespace MicrogridApi.DTOs.Qr;

public record QrTokenResponse(string ReservationId, string QrToken, DateTime ExpiresAt);