/*
 * AdminSeeder.cs
 * Creates the default Backoffice administrator on startup from the SeedAdmin settings,
 * but only when no Backoffice user exists yet.
 */

using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace MicrogridApi.Services;

public class AdminSeeder(
    UserRepository userRepository,
    IOptions<SeedAdminSettings> settings,
    ILogger<AdminSeeder> logger)
{
    // Creates the configured administrator if settings are present and no Backoffice user exists.
    public async Task SeedAsync()
    {
        var config = settings.Value;

        if (string.IsNullOrWhiteSpace(config.Email) || string.IsNullOrWhiteSpace(config.Password))
        {
            logger.LogWarning("SeedAdmin:Email and SeedAdmin:Password are not configured, so no default administrator will be created.");
            return;
        }

        if (await userRepository.ExistsByRoleAsync(Role.Backoffice))
        {
            return;
        }

        var email = config.Email.Trim().ToLowerInvariant();

        if (await userRepository.ExistsByEmailAsync(email))
        {
            logger.LogWarning("Cannot create the default administrator because {Email} already belongs to a non-Backoffice user.", email);
            return;
        }

        var admin = new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(config.Password),
            FullName = config.FullName,
            Role = Role.Backoffice,
            Status = UserStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            await userRepository.CreateAsync(admin);
            logger.LogInformation("Created the default administrator {Email}.", email);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            logger.LogInformation("The default administrator was created by another instance.");
        }
    }
}
