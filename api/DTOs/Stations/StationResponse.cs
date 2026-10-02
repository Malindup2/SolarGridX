/*
 * StationResponse.cs
 * Defines the station details returned to API clients.
 */

namespace MicrogridApi.DTOs.Stations;

public sealed record StationResponse(
    string Id,
    string StationName,
    string Location,
    double Latitude,
    double Longitude,
    double CapacityKwh,
    int BatterySlotCount,
    string Type,
    StationScheduleResponse OperationalSchedule,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record StationScheduleResponse(
    string OpenTime,
    string CloseTime,
    List<string> ActiveDays,
    List<DayHoursResponse> DayHours);

public sealed record DayHoursResponse(string Day, string OpenTime, string CloseTime);
