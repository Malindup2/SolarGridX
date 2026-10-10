/*
 * RevokedTokenRepository.cs
 * Stores the ids of signed-out tokens in the RevokedTokens collection. MongoDB removes
 * each entry automatically once the token would have expired.
 */

using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MongoDB.Driver;

namespace MicrogridApi.Repositories;

public class RevokedTokenRepository
{
    private readonly IMongoCollection<RevokedToken> _tokens;

    // Connects the repository to the RevokedTokens collection.
    public RevokedTokenRepository(MongoDbContext context)
    {
        _tokens = context.GetCollection<RevokedToken>("RevokedTokens");
    }

    // Marks a token id as revoked until the given expiry time.
    public Task RevokeAsync(string tokenId, DateTime expiresAtUtc) =>
        _tokens.ReplaceOneAsync(
            t => t.Id == tokenId,
            new RevokedToken { Id = tokenId, ExpiresAt = expiresAtUtc },
            new ReplaceOptions { IsUpsert = true });

    // True when the token id has been signed out.
    public Task<bool> IsRevokedAsync(string tokenId) =>
        _tokens.Find(t => t.Id == tokenId).AnyAsync();

    // Creates the TTL index that deletes each entry at its ExpiresAt time.
    public Task EnsureIndexAsync() =>
        _tokens.Indexes.CreateOneAsync(new CreateIndexModel<RevokedToken>(
            Builders<RevokedToken>.IndexKeys.Ascending(t => t.ExpiresAt),
            new CreateIndexOptions { ExpireAfter = TimeSpan.Zero }));
}
