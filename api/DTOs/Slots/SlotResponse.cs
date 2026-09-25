namespace MicrogridApi.DTOs.Slots;

public record SlotResponse(
    string Id,
    string StationId,
    DateTime SlotDate,
    string StartTime,
    string EndTime,
    double CapacityKwh,
    bool IsAvailable,
    int ReservedCount);