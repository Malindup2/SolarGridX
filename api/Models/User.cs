using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicrogridApi.Models;

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    public string? Nic { get; set; }
    public string? Username { get; set; }
    public string PasswordHash { get; set; } = null!;
    public bool MustChangePassword { get; set; }
    public string FullName { get; set; } = null!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Role Role { get; set; }

    [BsonRepresentation(BsonType.String)]
    public UserStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public enum Role
{
    Backoffice,
    GridOperator,
    Prosumer
}

public enum UserStatus
{
    Pending,
    Active,
    Deactivated
}
