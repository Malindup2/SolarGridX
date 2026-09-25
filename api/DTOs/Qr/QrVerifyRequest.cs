namespace MicrogridApi.DTOs.Qr;

public record QrVerifyRequest(
    string QrToken,
    string? OperatorId,
    string? StationId);
