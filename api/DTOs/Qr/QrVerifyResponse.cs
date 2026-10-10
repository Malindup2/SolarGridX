/*
 * QrVerifyResponse.cs
 * Defines the reservation and transfer details returned after QR preview or verification.
 */
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
    // Null on a preview: nothing has been completed yet.
    DateTime? CompletedAt);
