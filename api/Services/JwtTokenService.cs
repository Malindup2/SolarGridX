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
    private readonly JwtSettings _settings = settings.Value;

    public string GenerateToken(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(ClaimTypes.Role, user.Role.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new("status", user.Status.ToString())
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
