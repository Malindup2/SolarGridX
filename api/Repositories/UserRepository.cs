/*
 * UserRepository.cs
 * Reads and writes user accounts (Backoffice, Grid Operator and Prosumer) in the Users
 * collection in MongoDB.
 */

using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MongoDB.Driver;

namespace MicrogridApi.Repositories;

public class UserRepository
{
    private readonly IMongoCollection<User> _users;

    // Connects the repository to the Users collection.
    public UserRepository(MongoDbContext context)
    {
        _users = context.GetCollection<User>("Users");
    }

    // Finds a user by their (lowercase) email address.
    public Task<User?> FindByEmailAsync(string email) =>
        _users.Find(u => u.Email == email).FirstOrDefaultAsync()!;

    // True when any user already has this NIC.
    public Task<bool> ExistsByNicAsync(string nic) =>
        _users.Find(u => u.Nic == nic).AnyAsync();

    // True when any user already has this email.
    public Task<bool> ExistsByEmailAsync(string email) =>
        _users.Find(u => u.Email == email).AnyAsync();

    // True when at least one user has the given role.
    public Task<bool> ExistsByRoleAsync(Role role) =>
        _users.Find(u => u.Role == role).AnyAsync();

    // Finds a prosumer by the exact NIC given.
    public Task<User?> FindProsumerByNicAsync(string nic) =>
        _users.Find(u => u.Role == Role.Prosumer && u.Nic == nic).FirstOrDefaultAsync()!;

    // Finds a user by id.
    public Task<User?> FindByIdAsync(string id) =>
        _users.Find(u => u.Id == id).FirstOrDefaultAsync()!;

    // True when another user (not excludedId) already has this email.
    public Task<bool> ExistsByEmailExceptAsync(string email, string excludedId) =>
        _users.Find(u => u.Email == email && u.Id != excludedId).AnyAsync();

    // True when another user (not excludedId) already has this NIC.
    public Task<bool> ExistsByNicExceptAsync(string nic, string excludedId) =>
        _users.Find(u => u.Nic == nic && u.Id != excludedId).AnyAsync();

    // Counts the Active users in a role.
    public Task<long> CountActiveByRoleAsync(Role role) =>
        _users.CountDocumentsAsync(u => u.Role == role && u.Status == UserStatus.Active);

    // Lists the web application users (everyone except prosumers), sorted by name.
    public Task<List<User>> ListWebUsersAsync() =>
        _users.Find(u => u.Role != Role.Prosumer)
            .SortBy(u => u.FullName)
            .ToListAsync();

    // Lists prosumers, newest first, optionally only those in one status.
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

    // Finds the user whose stored password-reset token hash matches.
    public Task<User?> FindByResetTokenHashAsync(string hash) =>
        _users.Find(u => u.PasswordResetTokenHash == hash).FirstOrDefaultAsync()!;

    // Stores a new password-reset token hash with its expiry and request time.
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

    // Saves or clears (null) a user's profile photo and gives it a new version id.
    public Task SetAvatarAsync(string id, byte[]? bytes, string? contentType) =>
        _users.UpdateOneAsync(
            u => u.Id == id,
            Builders<User>.Update
                .Set(u => u.AvatarBytes, bytes)
                .Set(u => u.AvatarContentType, contentType)
                .Set(u => u.AvatarVersion, bytes is null ? null : Guid.NewGuid().ToString("N"))
                .Set(u => u.UpdatedAt, DateTime.UtcNow));

    // Finds a user by id without loading the photo bytes.
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

    // Inserts a new user.
    public Task CreateAsync(User user) => _users.InsertOneAsync(user);

    // Replaces a stored user with the given record.
    public Task ReplaceAsync(User user) =>
        _users.ReplaceOneAsync(u => u.Id == user.Id, user);

    // Sets a user's status (Pending, Active or Deactivated) and the update time.
    public Task UpdateStatusAsync(string id, UserStatus status) =>
        _users.UpdateOneAsync(
            u => u.Id == id,
            Builders<User>.Update
                .Set(u => u.Status, status)
                .Set(u => u.UpdatedAt, DateTime.UtcNow));

    // Deletes a user.
    public Task DeleteAsync(string id) => _users.DeleteOneAsync(u => u.Id == id);

    // Saves a new password hash and clears the must-change-password flag.
    public Task UpdatePasswordAsync(string id, string passwordHash) =>
        _users.UpdateOneAsync(
            u => u.Id == id,
            Builders<User>.Update
                .Set(u => u.PasswordHash, passwordHash)
                .Set(u => u.MustChangePassword, false)
                .Set(u => u.UpdatedAt, DateTime.UtcNow));
}
