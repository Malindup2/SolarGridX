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

    public Task<User?> FindByUsernameOrNicAsync(string usernameOrNic) =>
        _users.Find(u => u.Username == usernameOrNic || u.Nic == usernameOrNic).FirstOrDefaultAsync()!;

    public Task<bool> ExistsByNicAsync(string nic) =>
        _users.Find(u => u.Nic == nic).AnyAsync();

    public Task CreateAsync(User user) => _users.InsertOneAsync(user);
}
