namespace MicrogridApi.DTOs.Stations;

public record StationResponse(
    string Id,
    string StationName,
    string Location,
    double Latitude,
    double Longitude,
    double CapacityKwh,
    int BatterySlotCount,
    string Type,
    string Status);