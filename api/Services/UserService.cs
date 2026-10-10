/*
 * UserService.cs
 * Manages Backoffice and Grid Operator accounts: creation, listing, updates, and deletion.
 * Prevents changes to the caller's own access and protects the last active Backoffice account.
 */


using MicrogridApi.Common;
using MicrogridApi.DTOs.Users;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using MongoDB.Bson;
using MongoDB.Driver;

namespace MicrogridApi.Services;

public class UserService(UserRepository userRepository, EmailService emailService, ActivityService activityService)
{
    // Creates an active web user with a temporary password and emails them the sign-in details.
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

        await activityService.RecordAsync(
            AuditKinds.Users, user.Id, "AccountCreated",
            $"{user.Role} account created for {user.FullName}.",
            NotificationCategory.Account, ActivityActions.User);

        return ToResponse(user);
    }

    // Returns all web users; prosumers are not included.
    public async Task<List<UserResponse>> ListAsync()
    {
        var users = await userRepository.ListWebUsersAsync();
        return users.Select(ToResponse).ToList();
    }

    // Updates a web user's details, role and status; a caller cannot change their own access (BR-24).
    public async Task<Result<UserResponse>> UpdateAsync(string id, UpdateUserRequest request, string? callerId)
    {
        var user = await FindWebUserAsync(id);
        if (user is null)
        {
            return IdentityErrors.UserNotFound;
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var nic = string.IsNullOrWhiteSpace(request.Nic) ? null : request.Nic.Trim();
        var role = Enum.Parse<Role>(request.Role);
        var status = Enum.Parse<UserStatus>(request.Status);

        var accessChanged = role != user.Role || status != user.Status;
        if (accessChanged && user.Id == callerId)
        {
            return IdentityErrors.CannotChangeOwnAccess;
        }

        if (accessChanged && await IsLastActiveBackofficeAsync(user))
        {
            return IdentityErrors.LastBackoffice;
        }

        if (nic is not null && await userRepository.ExistsByNicExceptAsync(nic, user.Id))
        {
            return AuthErrors.NicAlreadyRegistered;
        }

        if (await userRepository.ExistsByEmailExceptAsync(email, user.Id))
        {
            return AuthErrors.EmailAlreadyRegistered;
        }

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.Nic = nic;
        user.Phone = request.Phone;
        user.Address = request.Address;
        user.Role = role;
        user.Status = status;
        user.UpdatedAt = DateTime.UtcNow;

        try
        {
            await userRepository.ReplaceAsync(user);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            return ex.WriteError.Message.Contains("Email_1")
                ? AuthErrors.EmailAlreadyRegistered
                : AuthErrors.NicAlreadyRegistered;
        }

        await activityService.RecordAsync(
            AuditKinds.Users, user.Id, "AccountUpdated",
            $"Your account details were updated by an administrator (status {user.Status}).",
            NotificationCategory.Account, ActivityActions.Profile, Recipients.ForUser(user.Id));

        return ToResponse(user);
    }

    // Deletes a web user, unless it is the caller or the last active Backoffice user.
    public async Task<Result> DeleteAsync(string id, string? callerId)
    {
        var user = await FindWebUserAsync(id);
        if (user is null)
        {
            return IdentityErrors.UserNotFound;
        }

        if (user.Id == callerId)
        {
            return IdentityErrors.CannotChangeOwnAccess;
        }

        if (await IsLastActiveBackofficeAsync(user))
        {
            return IdentityErrors.LastBackoffice;
        }

        await userRepository.DeleteAsync(user.Id);

        await activityService.RecordAsync(
            AuditKinds.Users, user.Id, "AccountDeleted",
            $"{user.Role} account {user.Email} was deleted.",
            NotificationCategory.Account, ActivityActions.User);

        return Result.Success();
    }

    // Prosumers are managed through ProsumerService, so they are invisible to the /users endpoints.
    private async Task<User?> FindWebUserAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return null;
        }

        var user = await userRepository.FindByIdAsync(id);
        return user is { Role: not Role.Prosumer } ? user : null;
    }

    // True when the user is the only active Backoffice account left.
    private async Task<bool> IsLastActiveBackofficeAsync(User user) =>
        user is { Role: Role.Backoffice, Status: UserStatus.Active }
        && await userRepository.CountActiveByRoleAsync(Role.Backoffice) <= 1;

    // Maps a stored user to the user response sent to clients (never includes the password hash).
    private static UserResponse ToResponse(User user) => new(
        user.Id,
        user.FullName,
        user.Email ?? string.Empty,
        user.Role.ToString(),
        user.Status.ToString(),
        user.Nic,
        user.Phone,
        user.Address,
        user.CreatedAt);
}
