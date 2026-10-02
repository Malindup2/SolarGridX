using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MongoDB.Driver;

namespace MicrogridApi.Repositories;

public class UserRepository
{
    private readonly IMongoCollection<User> _users;

    public UserRepository(MongoDbContext context)
    {
        _users = context.GetCollection<User>("Users");
    }

    public Task<User?> FindByEmailAsync(string email) =>
        _users.Find(u => u.Email == email).FirstOrDefaultAsync()!;

    public Task<bool> ExistsByNicAsync(string nic) =>
        _users.Find(u => u.Nic == nic).AnyAsync();

    public Task<bool> ExistsByEmailAsync(string email) =>
        _users.Find(u => u.Email == email).AnyAsync();

    public Task<bool> ExistsByRoleAsync(Role role) =>
        _users.Find(u => u.Role == role).AnyAsync();

    public Task<User?> FindProsumerByNicAsync(string nic) =>
        _users.Find(u => u.Role == Role.Prosumer && u.Nic == nic).FirstOrDefaultAsync()!;

    public Task<User?> FindByIdAsync(string id) =>
        _users.Find(u => u.Id == id).FirstOrDefaultAsync()!;

    public Task<bool> ExistsByEmailExceptAsync(string email, string excludedId) =>
        _users.Find(u => u.Email == email && u.Id != excludedId).AnyAsync();

    public Task<bool> ExistsByNicExceptAsync(string nic, string excludedId) =>
        _users.Find(u => u.Nic == nic && u.Id != excludedId).AnyAsync();

    public Task<long> CountActiveByRoleAsync(Role role) =>
        _users.CountDocumentsAsync(u => u.Role == role && u.Status == UserStatus.Active);

    public Task<List<User>> ListWebUsersAsync() =>
        _users.Find(u => u.Role != Role.Prosumer)
            .SortBy(u => u.FullName)
            .ToListAsync();

    public Task<List<User>> ListProsumersAsync(UserStatus? status)
    {
        var filter = Builders<User>.Filter.Eq(u => u.Role, Role.Prosumer);
        if (status is not null)
        {
            filter &= Builders<User>.Filter.Eq(u => u.Status, status.Value);
        }

        return _users.Find(filter).SortByDescending(u => u.CreatedAt).ToListAsync();
    }

    // Ids of every Active account in the given role (notification fan-out).
    public Task<List<string>> ActiveIdsByRoleAsync(Role role) =>
        _users.Find(u => u.Role == role && u.Status == UserStatus.Active)
            .Project(u => u.Id)
            .ToListAsync();

    // NIC lookups accept either case of the old-format V/X suffix.
    public async Task<User?> FindProsumerByNicAnyCaseAsync(string nic)
    {
        var trimmed = nic.Trim();
        return await FindProsumerByNicAsync(trimmed.ToUpperInvariant())
            ?? await FindProsumerByNicAsync(trimmed.ToLowerInvariant());
    }

    public Task<User?> FindByResetTokenHashAsync(string hash) =>
        _users.Find(u => u.PasswordResetTokenHash == hash).FirstOrDefaultAsync()!;

    public Task SetPasswordResetAsync(string id, string hash, DateTime expiresAt, DateTime requestedAt) =>
        _users.UpdateOneAsync(
            u => u.Id == id,
            Builders<User>.Update
                .Set(u => u.PasswordResetTokenHash, hash)
                .Set(u => u.PasswordResetExpiresAt, expiresAt)
                .Set(u => u.PasswordResetRequestedAt, requestedAt));

    // Sets a new password, clears any reset token and signs out every existing session.
    public Task ReplacePasswordAsync(string id, string passwordHash) =>
        _users.UpdateOneAsync(
            u => u.Id == id,
            Builders<User>.Update
                .Set(u => u.PasswordHash, passwordHash)
                .Set(u => u.MustChangePassword, false)
                .Unset(u => u.PasswordResetTokenHash)
                .Unset(u => u.PasswordResetExpiresAt)
                .Inc(u => u.SecurityVersion, 1)
                .Set(u => u.UpdatedAt, DateTime.UtcNow));

    public Task SetAvatarAsync(string id, byte[]? bytes, string? contentType) =>
        _users.UpdateOneAsync(
            u => u.Id == id,
            Builders<User>.Update
                .Set(u => u.AvatarBytes, bytes)
                .Set(u => u.AvatarContentType, contentType)
                .Set(u => u.AvatarVersion, bytes is null ? null : Guid.NewGuid().ToString("N"))
                .Set(u => u.UpdatedAt, DateTime.UtcNow));

    public Task<User?> FindWithoutAvatarAsync(string id) =>
        _users.Find(u => u.Id == id)
            .Project<User>(Builders<User>.Projection.Exclude(u => u.AvatarBytes))
            .FirstOrDefaultAsync()!;

    // Escaped, case-insensitive "contains" search used by the command palette.
    public Task<List<User>> SearchAsync(string pattern, bool prosumers, int limit)
    {
        var regex = new MongoDB.Bson.BsonRegularExpression(pattern, "i");
        var builder = Builders<User>.Filter;
        var filter = (prosumers ? builder.Eq(u => u.Role, Role.Prosumer) : builder.Ne(u => u.Role, Role.Prosumer))
            & builder.Or(
                builder.Regex(u => u.FullName, regex),
                builder.Regex(u => u.Email, regex),
                builder.Regex(u => u.Nic, regex));

        return _users.Find(filter, new FindOptions { MaxTime = TimeSpan.FromSeconds(2) })
            .Project<User>(Builders<User>.Projection.Exclude(u => u.AvatarBytes).Exclude(u => u.PasswordHash))
            .Limit(limit)
            .ToListAsync();
    }

    public Task CreateAsync(User user) => _users.InsertOneAsync(user);

    public Task ReplaceAsync(User user) =>
        _users.ReplaceOneAsync(u => u.Id == user.Id, user);

    public Task UpdateStatusAsync(string id, UserStatus status) =>
        _users.UpdateOneAsync(
            u => u.Id == id,
            Builders<User>.Update
                .Set(u => u.Status, status)
                .Set(u => u.UpdatedAt, DateTime.UtcNow));

    public Task DeleteAsync(string id) => _users.DeleteOneAsync(u => u.Id == id);

    public Task UpdatePasswordAsync(string id, string passwordHash) =>
        _users.UpdateOneAsync(
            u => u.Id == id,
            Builders<User>.Update
                .Set(u => u.PasswordHash, passwordHash)
                .Set(u => u.MustChangePassword, false)
                .Set(u => u.UpdatedAt, DateTime.UtcNow));
}
