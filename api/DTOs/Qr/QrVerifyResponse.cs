namespace MicrogridApi.DTOs.Qr;

public record QrVerifyResponse(
    bool Valid,
    string ReservationId,
    string ProsumerName,
    string Nic,
    string StationId,
    string StationName,
    double EnergyKwh,
    string SlotTime,
    string Status,
    DateTime CompletedAt);
