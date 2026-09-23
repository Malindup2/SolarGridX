using MicrogridApi.Common;
using MicrogridApi.DTOs.Prosumers;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using MongoDB.Driver;

namespace MicrogridApi.Services;

public class ProsumerService(UserRepository userRepository, EmailService emailService)
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
