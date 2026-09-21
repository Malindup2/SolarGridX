using MongoDB.Bson.Serialization.Attributes;

namespace MicrogridApi.Models;

public class RevokedToken
{
    [BsonId]
    public string Id { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }
}
