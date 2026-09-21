using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MongoDB.Driver;

namespace MicrogridApi.Repositories;

public class RevokedTokenRepository
{
    private readonly IMongoCollection<RevokedToken> _tokens;

    public RevokedTokenRepository(MongoDbContext context)
    {
        _tokens = context.GetCollection<RevokedToken>("RevokedTokens");
    }

    public Task RevokeAsync(string tokenId, DateTime expiresAtUtc) =>
        _tokens.ReplaceOneAsync(
            t => t.Id == tokenId,
            new RevokedToken { Id = tokenId, ExpiresAt = expiresAtUtc },
            new ReplaceOptions { IsUpsert = true });

    public Task<bool> IsRevokedAsync(string tokenId) =>
        _tokens.Find(t => t.Id == tokenId).AnyAsync();

    public Task EnsureIndexAsync() =>
        _tokens.Indexes.CreateOneAsync(new CreateIndexModel<RevokedToken>(
            Builders<RevokedToken>.IndexKeys.Ascending(t => t.ExpiresAt),
            new CreateIndexOptions { ExpireAfter = TimeSpan.Zero }));
}
