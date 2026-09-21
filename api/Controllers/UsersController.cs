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
    IValidator<CreateUserRequest> createValidator) : ApiControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
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
