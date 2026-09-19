using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicrogridApi.Models;


public class EnergyReservation
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    public string Nic { get; set; } = null!;

    [BsonRepresentation(BsonType.ObjectId)]
    public string StationId { get; set; } = null!;

    [BsonRepresentation(BsonType.ObjectId)]
    public string SlotId { get; set; } = null!;

    public DateTime ReservationDate { get; set; }
    public string StartTime { get; set; } = null!;
    public string EndTime { get; set; } = null!;
    public double EnergyKwh { get; set; }

    [BsonRepresentation(BsonType.String)]
    public ReservationStatus Status { get; set; }

    public string? QrToken { get; set; }
    public string? ApprovedBy { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? CompletedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public enum ReservationStatus
{
    Pending,
    Approved,
    Rejected,
    Completed,
    Cancelled
}
