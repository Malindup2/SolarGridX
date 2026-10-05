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
    DateTime UpdatedAt,
    // True when a prosumer can book a slot here now (online, inside the 7-day window, not started, a bay free).
    // Filled in by the read endpoints (list, nearby, by id); null on write responses, where it is not worked out.
    bool? HasUpcomingSlots = null);

public sealed record StationScheduleResponse(
    string OpenTime,
    string CloseTime,
    List<string> ActiveDays,
    List<DayHoursResponse> DayHours);

public sealed record DayHoursResponse(string Day, string OpenTime, string CloseTime);
