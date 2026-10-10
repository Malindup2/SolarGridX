/*
 * ProfileController.cs
 * Handles the signed-in user's own account (/users/me) for every role: profile details,
 * self-deactivation for prosumers, and the profile photo.
 */

using FluentValidation;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Users;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

// The signed-in user's own account, for every role.
[Route("api/users")]
[Authorize]
public class ProfileController(
    ProfileService profileService,
    IValidator<UpdateProfileRequest> updateValidator) : ApiControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    // Returns the signed-in user's own profile.
    public async Task<IActionResult> Get()
    {
        var result = await profileService.GetAsync(CallerId);
        return ToResponse(result, profile => Ok(profile));
    }

    [HttpPut("me")]
    [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    // Validates and saves the signed-in user's own profile details.
    public async Task<IActionResult> Update(UpdateProfileRequest request)
    {
        var invalid = await ValidateAsync(updateValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await profileService.UpdateAsync(CallerId, request);
        return ToResponse(result, profile => Ok(profile));
    }

    // A prosumer closes their own account; only the Backoffice can reactivate it (BR-05).
    [HttpPost("me/deactivation-request")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RequestDeactivation()
    {
        var result = await profileService.RequestDeactivationAsync(CallerId, CallerRole, CallerNic);
        return ToResponse(result, () => NoContent());
    }

    [HttpGet("me/avatar")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    // Returns the signed-in user's own profile photo.
    public Task<IActionResult> GetOwnAvatar() => AvatarAsync(CallerId ?? string.Empty);

    // Staff can see anyone's photo (user lists, prosumer details).
    [HttpGet("{id}/avatar")]
    [Authorize(Roles = $"{RoleNames.Backoffice},{RoleNames.GridOperator}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public Task<IActionResult> GetAvatar(string id) => AvatarAsync(id);

    [HttpPut("me/avatar")]
    [RequestSizeLimit(ProfileService.MaxAvatarBytes + 64 * 1024)]
    [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    // Uploads or replaces the signed-in user's profile photo (JPEG or PNG, BR-30).
    public async Task<IActionResult> SetAvatar(IFormFile? file)
    {
        if (file is null)
        {
            return ToErrorResponse(Error.Validation("VALIDATION_FAILED", "One or more validation errors occurred.", ["file: choose a photo to upload."]));
        }

        await using var stream = file.OpenReadStream();
        var result = await profileService.SetAvatarAsync(CallerId, stream, file.Length);
        return ToResponse(result, profile => Ok(profile));
    }

    [HttpDelete("me/avatar")]
    [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
    // Removes the signed-in user's profile photo.
    public async Task<IActionResult> RemoveAvatar()
    {
        var result = await profileService.RemoveAvatarAsync(CallerId);
        return ToResponse(result, profile => Ok(profile));
    }

    // Sends a user's photo bytes with headers that stop caching and content sniffing.
    private async Task<IActionResult> AvatarAsync(string id)
    {
        var result = await profileService.GetAvatarAsync(id);
        if (!result.IsSuccess)
        {
            return ToErrorResponse(result.Error!);
        }

        Response.Headers.CacheControl = "private, no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(result.Value.Bytes, result.Value.ContentType);
    }
}
