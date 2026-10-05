/*
 * JwtTokenService.cs
 * Creates the signed JWT session token issued at sign-in, carrying the user's id, role,
 * status, NIC and security version.
 */

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MicrogridApi.Configuration;
using MicrogridApi.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace MicrogridApi.Services;

public class JwtTokenService(IOptions<JwtSettings> settings)
{
    public const string SecurityVersionClaim = "sv";

    private readonly JwtSettings _settings = settings.Value;

    // Builds and signs a token for the user that expires after the configured number of minutes.
    public string GenerateToken(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(ClaimTypes.Role, user.Role.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new("status", user.Status.ToString()),
            // Checked on every request; a password change or reset bumps it and ends older sessions.
            new(SecurityVersionClaim, user.SecurityVersion.ToString(System.Globalization.CultureInfo.InvariantCulture))
        };

        if (!string.IsNullOrEmpty(user.Nic))
        {
            claims.Add(new Claim("nic", user.Nic));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_settings.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
