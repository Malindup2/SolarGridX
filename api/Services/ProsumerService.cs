/*
 * ProsumerService.cs
 * Applies rules for creating, viewing, updating, activating, and deactivating prosumer accounts.
 */

using MicrogridApi.Common;
using MicrogridApi.DTOs.Prosumers;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using MongoDB.Driver;

namespace MicrogridApi.Services;

public class ProsumerService(UserRepository userRepository, EmailService emailService, ActivityService activityService)
{
    public async Task<Result<List<ProsumerResponse>>> ListAsync(string? status)
    {
        UserStatus? filter = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<UserStatus>(status, ignoreCase: true, out var parsed) || !Enum.IsDefined(parsed))
            {
                return IdentityErrors.InvalidStatusFilter;
            }

            filter = parsed;
        }

        var prosumers = await userRepository.ListProsumersAsync(filter);
        return prosumers.Select(ToResponse).ToList();
    }

    public async Task<Result<ProsumerResponse>> GetAsync(string nic, string? callerId, string? callerRole)
    {
        var prosumer = await FindAsync(nic);
        if (prosumer is null)
        {
            return IdentityErrors.ProsumerNotFound;
        }

        if (!CanAccess(prosumer, callerId, callerRole))
        {
            return IdentityErrors.NotOwnProfile;
        }

        return ToResponse(prosumer);
    }

    // BR-06: the NIC is the prosumer's primary key, checked here and backed by the unique Nic index.
    public async Task<Result<ProsumerResponse>> CreateAsync(CreateProsumerRequest request)
    {
        var nic = request.Nic.Trim().ToUpperInvariant();
        var email = request.Email.Trim().ToLowerInvariant();

        if (await userRepository.ExistsByNicAsync(nic) || await userRepository.ExistsByNicAsync(nic.ToLowerInvariant()))
        {
            return AuthErrors.NicAlreadyRegistered;
        }

        if (await userRepository.ExistsByEmailAsync(email))
        {
            return AuthErrors.EmailAlreadyRegistered;
        }

        var prosumer = new User
        {
            Nic = nic,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            MustChangePassword = true,
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = request.Phone,
            Address = request.Address,
            Role = Role.Prosumer,
            Status = UserStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            await userRepository.CreateAsync(prosumer);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            return ex.WriteError.Message.Contains("Email_1")
                ? AuthErrors.EmailAlreadyRegistered
                : AuthErrors.NicAlreadyRegistered;
        }

        await emailService.SendAccountCreatedEmailAsync(email, prosumer.FullName, "Solar Prosumer", request.Password, "SolarGridX mobile app");

        await activityService.RecordAsync(
            AuditKinds.Users, prosumer.Id, "AccountCreated",
            $"Prosumer account created for {prosumer.FullName} ({prosumer.Nic}).",
            NotificationCategory.Account, ActivityActions.Prosumer, resourceId: prosumer.Nic);

        return ToResponse(prosumer);
    }

    public async Task<Result<ProsumerResponse>> UpdateAsync(
        string nic, UpdateProsumerRequest request, string? callerId, string? callerRole)
    {
        var prosumer = await FindAsync(nic);
        if (prosumer is null)
        {
            return IdentityErrors.ProsumerNotFound;
        }

        if (!CanAccess(prosumer, callerId, callerRole))
        {
            return IdentityErrors.NotOwnProfile;
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (await userRepository.ExistsByEmailExceptAsync(email, prosumer.Id))
        {
            return AuthErrors.EmailAlreadyRegistered;
        }

        prosumer.FullName = request.FullName.Trim();
        prosumer.Email = email;
        prosumer.Phone = request.Phone;
        prosumer.Address = request.Address;
        prosumer.UpdatedAt = DateTime.UtcNow;

        try
        {
            await userRepository.ReplaceAsync(prosumer);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            return AuthErrors.EmailAlreadyRegistered;
        }

        await activityService.RecordAsync(
            AuditKinds.Users, prosumer.Id, "ProfileUpdated",
            "Your profile details were updated.",
            NotificationCategory.Account, ActivityActions.Profile, Recipients.ForUser(prosumer.Id));

        return ToResponse(prosumer);
    }

    // BR-05: only a Backoffice officer reaches this method; the controller restricts the role.
    public async Task<Result<ProsumerResponse>> ActivateAsync(string nic)
    {
        var prosumer = await FindAsync(nic);
        if (prosumer is null)
        {
            return IdentityErrors.ProsumerNotFound;
        }

        if (prosumer.Status == UserStatus.Active)
        {
            return IdentityErrors.ProsumerAlreadyActive;
        }

        await userRepository.UpdateStatusAsync(prosumer.Id, UserStatus.Active);
        prosumer.Status = UserStatus.Active;
        prosumer.UpdatedAt = DateTime.UtcNow;

        await activityService.RecordAsync(
            AuditKinds.Users, prosumer.Id, "AccountActivated",
            "Your SolarGridX account is active. You can now reserve energy transfers.",
            NotificationCategory.Account, ActivityActions.Profile, Recipients.ForUser(prosumer.Id));

        if (!string.IsNullOrEmpty(prosumer.Email))
        {
            await emailService.SendAccountStatusAsync(prosumer.Email, prosumer.FullName, activated: true);
        }

        return ToResponse(prosumer);
    }

    public async Task<Result<ProsumerResponse>> DeactivateAsync(string nic, string? callerId, string? callerRole)
    {
        var prosumer = await FindAsync(nic);
        if (prosumer is null)
        {
            return IdentityErrors.ProsumerNotFound;
        }

        if (!CanAccess(prosumer, callerId, callerRole))
        {
            return IdentityErrors.NotOwnProfile;
        }

        if (prosumer.Status == UserStatus.Deactivated)
        {
            return IdentityErrors.ProsumerAlreadyDeactivated;
        }

        await userRepository.UpdateStatusAsync(prosumer.Id, UserStatus.Deactivated);
        prosumer.Status = UserStatus.Deactivated;
        prosumer.UpdatedAt = DateTime.UtcNow;

        // A prosumer closing their own account is news for the Backoffice; otherwise tell the prosumer.
        var selfService = callerRole == RoleNames.Prosumer;
        await activityService.RecordAsync(
            AuditKinds.Users, prosumer.Id, "AccountDeactivated",
            selfService
                ? $"{prosumer.FullName} ({prosumer.Nic}) deactivated their account."
                : "Your SolarGridX account has been deactivated. Contact the Backoffice to reactivate it.",
            NotificationCategory.Account,
            selfService ? ActivityActions.Prosumer : ActivityActions.Profile,
            selfService ? Recipients.ForRole(Role.Backoffice) : Recipients.ForUser(prosumer.Id),
            resourceId: selfService ? prosumer.Nic : null);

        if (!selfService && !string.IsNullOrEmpty(prosumer.Email))
        {
            await emailService.SendAccountStatusAsync(prosumer.Email, prosumer.FullName, activated: false);
        }

        return ToResponse(prosumer);
    }

    // Old-format NICs end in V or X; registration stores the letter as typed, so both cases are tried.
    private async Task<User?> FindAsync(string nic)
    {
        var trimmed = nic.Trim();
        return await userRepository.FindProsumerByNicAsync(trimmed.ToUpperInvariant())
            ?? await userRepository.FindProsumerByNicAsync(trimmed.ToLowerInvariant());
    }

    private static bool CanAccess(User prosumer, string? callerId, string? callerRole) =>
        callerRole != RoleNames.Prosumer || prosumer.Id == callerId;

    private static ProsumerResponse ToResponse(User user) => new(
        user.Nic ?? string.Empty,
        user.FullName,
        user.Email ?? string.Empty,
        user.Phone,
        user.Address,
        user.Status.ToString(),
        user.CreatedAt,
        user.UpdatedAt);
}
