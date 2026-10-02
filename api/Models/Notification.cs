using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicrogridApi.Models;

// An inbox item for one user. Expires automatically after 90 days (TTL index on CreatedAt).
public class Notification
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = null!;

    [BsonRepresentation(BsonType.String)]
    public NotificationCategory Category { get; set; }

    [BsonRepresentation(BsonType.String)]
    public NotificationPriority Priority { get; set; }

    public string Message { get; set; } = null!;

    // Where "Open" takes the user: Reservation, Station, Prosumer, User or Profile.
    public string Action { get; set; } = null!;
    public string? ResourceId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

public enum NotificationCategory
{
    Account,
    Reservation,
    Catalog,
    Security
}

public enum NotificationPriority
{
    Low,
    Medium,
    High
}
