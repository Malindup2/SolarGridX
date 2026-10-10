/*
 * User.cs
 * Defines a user account stored in the Users collection (Backoffice, Grid Operator or
 * Prosumer), with the Role and UserStatus values it can hold.
 */

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

    // Bumped on password change or reset; every JWT carries it, so older tokens stop working.
    public int SecurityVersion { get; set; }

    // Password recovery. Only the SHA-256 of the emailed token is stored.
    public string? PasswordResetTokenHash { get; set; }
    public DateTime? PasswordResetExpiresAt { get; set; }
    public DateTime? PasswordResetRequestedAt { get; set; }

    // Profile photo, validated (JPEG/PNG, at most 1 MB) and stored as uploaded.
    public byte[]? AvatarBytes { get; set; }
    public string? AvatarContentType { get; set; }
    public string? AvatarVersion { get; set; }
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
