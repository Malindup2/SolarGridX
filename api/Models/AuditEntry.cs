using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicrogridApi.Models;

// One thing that happened to a record: who did it, when, and the request it came from.
// Never holds credentials or request bodies.
public class AuditEntry
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    // users | stations | slots | reservations
    public string Kind { get; set; } = null!;

    public string EntityId { get; set; } = null!;

    // e.g. ReservationApproved, StationDeactivated, PasswordChanged
    public string Event { get; set; } = null!;

    public string? ActorId { get; set; }
    public string ActorName { get; set; } = "System";
    public string? ActorRole { get; set; }

    public DateTime At { get; set; }
    public string? CorrelationId { get; set; }
}

public static class AuditKinds
{
    public const string Users = "users";
    public const string Stations = "stations";
    public const string Slots = "slots";
    public const string Reservations = "reservations";

    public static readonly string[] All = [Users, Stations, Slots, Reservations];
}
