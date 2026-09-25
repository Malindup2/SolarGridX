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

    public Task CreateAsync(User user) => _users.InsertOneAsync(user);

    public Task UpdatePasswordAsync(string id, string passwordHash) =>
        _users.UpdateOneAsync(
            u => u.Id == id,
            Builders<User>.Update
                .Set(u => u.PasswordHash, passwordHash)
                .Set(u => u.MustChangePassword, false)
                .Set(u => u.UpdatedAt, DateTime.UtcNow));
}
