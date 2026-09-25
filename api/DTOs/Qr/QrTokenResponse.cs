namespace MicrogridApi.DTOs.Qr;

public record QrTokenResponse(string ReservationId, string QrToken, DateTime ExpiresAt);