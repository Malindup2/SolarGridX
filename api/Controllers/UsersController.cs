/*
 * UsersController.cs
 * Handles web application user requests (Backoffice and Grid Operator accounts).
 * Backoffice only. Prosumers are managed through ProsumersController.
 */

using FluentValidation;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Users;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

[Route("api/users")]
[Authorize(Roles = RoleNames.Backoffice)]
public class UsersController(
    UserService userService,
    IValidator<CreateUserRequest> createValidator,
    IValidator<UpdateUserRequest> updateValidator) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(List<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    // Returns every web application user.
    public async Task<IActionResult> List() => Ok(await userService.ListAsync());

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    // Validates and saves a user's details, role and status.
    public async Task<IActionResult> Update(string id, UpdateUserRequest request)
    {
        var invalid = await ValidateAsync(updateValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await userService.UpdateAsync(id, request, CallerId);
        return ToResponse(result, user => Ok(user));
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    // Deletes a user; the caller cannot delete their own account (BR-24).
    public async Task<IActionResult> Delete(string id)
    {
        var result = await userService.DeleteAsync(id, CallerId);
        return ToResponse(result, () => NoContent());
    }

    [HttpPost]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    // Validates and creates an active web user, then returns the created record.
    public async Task<IActionResult> Create(CreateUserRequest request)
    {
        var invalid = await ValidateAsync(createValidator, request);
        if (invalid is not null)
        {
            return ToErrorResponse(invalid);
        }

        var result = await userService.CreateAsync(request);
        return ToResponse(result, user => StatusCode(StatusCodes.Status201Created, user));
    }
}
