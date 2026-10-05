/*
 * ProfileService.cs
 * Applies rules for viewing and updating profiles, managing profile photos, and requesting account deactivation.
 */
 
using MicrogridApi.Common;
using MicrogridApi.DTOs.Users;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using MongoDB.Bson;
using MongoDB.Driver;

namespace MicrogridApi.Services;

public static class ProfileErrors
{
    public static readonly Error NotFound =
        Error.NotFound("ACCOUNT_NOT_FOUND", "Your account could not be found. Sign in again.");

    public static readonly Error NoAvatar =
        Error.NotFound("AVATAR_NOT_FOUND", "No profile photo has been uploaded.");

    public static readonly Error AvatarTooLarge = Error.Validation(
        "AVATAR_TOO_LARGE", $"The photo must be {ProfileService.MaxAvatarBytes / 1024 / 1024} MB or smaller.");

    public static readonly Error AvatarType = Error.Validation(
        "AVATAR_TYPE_NOT_ALLOWED", "The photo must be a JPEG or PNG image.");

    public static readonly Error OnlyProsumers = Error.Forbidden(
        "DEACTIVATION_REQUEST_PROSUMER_ONLY", "Only prosumer accounts can close themselves; staff accounts are managed by the Backoffice.");
}

// The signed-in user's own account: details, photo and (for prosumers) closing the account.
public class ProfileService(UserRepository userRepository, ProsumerService prosumerService, ActivityService activityService)
{
    public const int MaxAvatarBytes = 1024 * 1024;

    private static readonly byte[] JpegMagic = [0xFF, 0xD8, 0xFF];
    private static readonly byte[] PngMagic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    public async Task<Result<ProfileResponse>> GetAsync(string? callerId)
    {
        var user = await LoadAsync(callerId);
        return user is null ? ProfileErrors.NotFound : ToResponse(user);
    }

    public async Task<Result<ProfileResponse>> UpdateAsync(string? callerId, UpdateProfileRequest request)
    {
        var user = await LoadAsync(callerId);
        if (user is null)
        {
            return ProfileErrors.NotFound;
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (await userRepository.ExistsByEmailExceptAsync(email, user.Id))
        {
            return AuthErrors.EmailAlreadyRegistered;
        }

        var full = await userRepository.FindByIdAsync(user.Id);
        full!.FullName = request.FullName.Trim();
        full.Email = email;
        full.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        full.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        full.UpdatedAt = DateTime.UtcNow;

        try
        {
            await userRepository.ReplaceAsync(full);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            return AuthErrors.EmailAlreadyRegistered;
        }

        await activityService.RecordAsync(
            AuditKinds.Users, full.Id, "ProfileUpdated", "Profile details updated.",
            NotificationCategory.Account, ActivityActions.Profile);

        return ToResponse(full);
    }

    // A prosumer closing their own account. Only the Backoffice can reactivate it (BR-05).
    public async Task<Result> RequestDeactivationAsync(string? callerId, string? callerRole, string? callerNic)
    {
        if (callerRole != RoleNames.Prosumer || string.IsNullOrEmpty(callerNic))
        {
            return ProfileErrors.OnlyProsumers;
        }

        var result = await prosumerService.DeactivateAsync(callerNic, callerId, callerRole);
        return result.IsSuccess ? Result.Success() : result.Error!;
    }

    public async Task<Result<(byte[] Bytes, string ContentType)>> GetAvatarAsync(string id)
    {
        var user = ObjectId.TryParse(id, out _) ? await userRepository.FindByIdAsync(id) : null;
        if (user is null)
        {
            return ProfileErrors.NotFound;
        }

        return user.AvatarBytes is { Length: > 0 } bytes
            ? (bytes, user.AvatarContentType ?? "application/octet-stream")
            : ProfileErrors.NoAvatar;
    }

    // Accepts JPEG or PNG up to 1 MB. The type comes from the file's own first bytes, not from the
    // name or the declared content type, which the client controls.
    public async Task<Result<ProfileResponse>> SetAvatarAsync(string? callerId, Stream content, long length)
    {
        var user = await LoadAsync(callerId);
        if (user is null)
        {
            return ProfileErrors.NotFound;
        }

        if (length <= 0 || length > MaxAvatarBytes)
        {
            return ProfileErrors.AvatarTooLarge;
        }

        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer);
        var bytes = buffer.ToArray();

        if (bytes.Length == 0 || bytes.Length > MaxAvatarBytes)
        {
            return ProfileErrors.AvatarTooLarge;
        }

        var contentType = DetectImageType(bytes);
        if (contentType is null)
        {
            return ProfileErrors.AvatarType;
        }

        await userRepository.SetAvatarAsync(user.Id, bytes, contentType);
        await activityService.RecordAsync(
            AuditKinds.Users, user.Id, "AvatarUpdated", "Profile photo updated.",
            NotificationCategory.Account, ActivityActions.Profile);

        return ToResponse((await LoadAsync(user.Id))!);
    }

    public async Task<Result<ProfileResponse>> RemoveAvatarAsync(string? callerId)
    {
        var user = await LoadAsync(callerId);
        if (user is null)
        {
            return ProfileErrors.NotFound;
        }

        await userRepository.SetAvatarAsync(user.Id, null, null);
        await activityService.RecordAsync(
            AuditKinds.Users, user.Id, "AvatarRemoved", "Profile photo removed.",
            NotificationCategory.Account, ActivityActions.Profile);

        return ToResponse((await LoadAsync(user.Id))!);
    }

    public static string? DetectImageType(byte[] bytes) =>
        bytes.AsSpan().StartsWith(JpegMagic) ? "image/jpeg"
        : bytes.AsSpan().StartsWith(PngMagic) ? "image/png"
        : null;

    private async Task<User?> LoadAsync(string? id) =>
        string.IsNullOrEmpty(id) || !ObjectId.TryParse(id, out _) ? null : await userRepository.FindWithoutAvatarAsync(id);

    private static ProfileResponse ToResponse(User user) => new(
        user.Id,
        user.FullName,
        user.Email ?? string.Empty,
        user.Phone,
        user.Address,
        user.Nic,
        user.Role.ToString(),
        user.Status.ToString(),
        user.CreatedAt,
        user.UpdatedAt,
        user.AvatarVersion);
}
