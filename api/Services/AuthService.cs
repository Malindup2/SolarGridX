using MicrogridApi.Common;
using MicrogridApi.DTOs.Auth;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using MongoDB.Driver;

namespace MicrogridApi.Services;

public class AuthService(UserRepository userRepository, JwtTokenService jwtTokenService, EmailService emailService)
{
    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await userRepository.FindByUsernameOrNicAsync(request.Username);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new ApiException("INVALID_CREDENTIALS", "Invalid username or password.", StatusCodes.Status401Unauthorized);
        }

        if (user.Status != UserStatus.Active)
        {
            throw new ApiException("ACCOUNT_NOT_ACTIVE", $"Account is {user.Status}.", StatusCodes.Status403Forbidden);
        }

        var token = jwtTokenService.GenerateToken(user);

        return new LoginResponse(
            Token: token,
            Role: user.Role.ToString(),
            Nic: user.Nic,
            DisplayName: user.FullName,
            HomeRoute: HomeRouteFor(user.Role));
    }

    public async Task RegisterAsync(RegisterRequest request)
    {
        if (await userRepository.ExistsByNicAsync(request.Nic))
        {
            throw new ApiException("NIC_ALREADY_REGISTERED", "This NIC is already registered.", StatusCodes.Status409Conflict);
        }

        var user = new User
        {
            Nic = request.Nic,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address,
            Role = Role.Prosumer,
            Status = UserStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            await userRepository.CreateAsync(user);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            throw new ApiException("NIC_ALREADY_REGISTERED", "This NIC is already registered.", StatusCodes.Status409Conflict);
        }

        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            await emailService.SendRegistrationSuccessEmailAsync(user.Email, user.FullName);
        }
    }

    private static string HomeRouteFor(Role role) => role switch
    {
        Role.Backoffice => "/backoffice/dashboard",
        Role.GridOperator => "/operator/home",
        Role.Prosumer => "/prosumer/home",
        _ => "/"
    };
}
