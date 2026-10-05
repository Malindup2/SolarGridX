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

/// <param name="DayHours">Optional per-day hours that replace the default OpenTime/CloseTime on those days.</param>
/// <param name="ExpectedUpdatedAt">Optional edit-conflict check (schedule updates only).</param>
public sealed record StationScheduleRequest(
    string? OpenTime,
    string? CloseTime,
    List<string>? ActiveDays,
    List<DayHoursRequest>? DayHours = null,
    DateTime? ExpectedUpdatedAt = null);

public sealed record DayHoursRequest(string? Day, string? OpenTime, string? CloseTime);