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

    public Task<User?> FindByIdAsync(string id) =>
        _users.Find(u => u.Id == id).FirstOrDefaultAsync()!;

    public Task<User?> FindProsumerByNicAsync(string nic) =>
        _users.Find(u => u.Role == Role.Prosumer && u.Nic == nic).FirstOrDefaultAsync()!;

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
