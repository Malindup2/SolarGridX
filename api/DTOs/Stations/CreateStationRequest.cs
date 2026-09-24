/*
 * CreateStationRequest.cs
 * Defines the station details a Backoffice user sends when registering a station.
 */

namespace MicrogridApi.DTOs.Stations;

public sealed record CreateStationRequest(
    string? StationName,
    string? Location,
    double? Latitude,
    double? Longitude,
    double? CapacityKwh,
    int? BatterySlotCount,
    string? Type,
    StationScheduleRequest? OperationalSchedule);

public sealed record StationScheduleRequest(
    string? OpenTime,
    string? CloseTime,
    List<string>? ActiveDays);