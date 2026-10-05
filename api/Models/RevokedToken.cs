/*
 * RevokedToken.cs
 * Defines a signed-out token id stored in the RevokedTokens collection until it expires.
 */

using MongoDB.Bson.Serialization.Attributes;

namespace MicrogridApi.Models;

public class RevokedToken
{
    [BsonId]
    public string Id { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }
}
