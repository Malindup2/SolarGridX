using MicrogridApi.Common;
using MicrogridApi.DTOs.Users;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using MongoDB.Driver;

namespace MicrogridApi.Services;

public class UserService(UserRepository userRepository, EmailService emailService)
{
    public async Task<Result<UserResponse>> CreateAsync(CreateUserRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var nic = string.IsNullOrWhiteSpace(request.Nic) ? null : request.Nic.Trim();

        if (nic is not null && await userRepository.ExistsByNicAsync(nic))
        {
            return AuthErrors.NicAlreadyRegistered;
        }

        if (await userRepository.ExistsByEmailAsync(email))
        {
            return AuthErrors.EmailAlreadyRegistered;
        }

        var user = new User
        {
            Nic = nic,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            MustChangePassword = true,
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = request.Phone,
            Address = request.Address,
            Role = Enum.Parse<Role>(request.Role),
            Status = UserStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            await userRepository.CreateAsync(user);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            return ex.WriteError.Message.Contains("Email_1")
                ? AuthErrors.EmailAlreadyRegistered
                : AuthErrors.NicAlreadyRegistered;
        }

        await emailService.SendAccountCreatedEmailAsync(email, user.FullName, user.Role.ToString(), request.Password);

        return new UserResponse(
            user.Id,
            user.FullName,
            email,
            user.Role.ToString(),
            user.Status.ToString(),
            user.Nic,
            user.Phone,
            user.Address,
            user.CreatedAt);
    }
}
