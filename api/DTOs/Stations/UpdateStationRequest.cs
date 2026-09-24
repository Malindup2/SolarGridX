/*
 * UpdateStationRequest.cs
 * Defines the station details a Backoffice user can edit.
 * Schedule and status have separate endpoints.
 */

namespace MicrogridApi.DTOs.Stations;

public sealed record UpdateStationRequest(
    string? StationName,
    string? Location,
    double? Latitude,
    double? Longitude,
    double? CapacityKwh,
    int? BatterySlotCount,
    string? Type);