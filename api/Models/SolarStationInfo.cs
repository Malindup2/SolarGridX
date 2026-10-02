using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicrogridApi.Models;


public class SolarStationInfo
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    public string StationName { get; set; } = null!;
    public string Location { get; set; } = null!;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double CapacityKwh { get; set; }
    public int BatterySlotCount { get; set; }

    [BsonRepresentation(BsonType.String)]
    public StationType Type { get; set; }

    public OperationalSchedule OperationalSchedule { get; set; } = new();

    [BsonRepresentation(BsonType.String)]
    public StationStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class OperationalSchedule
{
    // Default hours, used on every active day that has no entry in DayHours.
    public string OpenTime { get; set; } = null!;
    public string CloseTime { get; set; } = null!;
    public List<string> ActiveDays { get; set; } = new();

    // Optional per-day overrides, e.g. shorter hours on Saturday.
    public List<DayHours> DayHours { get; set; } = new();

    // The opening hours that apply on one weekday ("Monday"...).
    public (string Open, string Close) HoursFor(string day)
    {
        var special = DayHours.FirstOrDefault(d => string.Equals(d.Day, day, StringComparison.OrdinalIgnoreCase));
        return special is null ? (OpenTime, CloseTime) : (special.OpenTime, special.CloseTime);
    }
}

public class DayHours
{
    public string Day { get; set; } = null!;
    public string OpenTime { get; set; } = null!;
    public string CloseTime { get; set; } = null!;
}

public enum StationType
{
    AC,
    DC
}

public enum StationStatus
{
    Active,
    Inactive
}
