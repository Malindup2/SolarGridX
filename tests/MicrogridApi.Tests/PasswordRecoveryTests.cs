using System.Net;
using System.Net.Http.Json;
using MicrogridApi.DTOs.Auth;
using MicrogridApi.Models;
using MicrogridApi.Services;
using MicrogridApi.Tests.Infrastructure;
using MongoDB.Driver;
using Xunit;

namespace MicrogridApi.Tests;

// Forgot / reset password, change password, and signing out other sessions.
[Collection(ApiCollection.Name)]
public class PasswordRecoveryTests(ApiFixture api)
{
    private const string NewPassword = "Brand-new-pass-9";

    [MongoFact]
    public async Task Forgot_password_gives_the_same_answer_for_known_and_unknown_emails()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = api.CreateClient();

        var known = await client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest(prosumer.Email));
        var unknown = await client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest("nobody-here@test.local"));

        Assert.Equal(HttpStatusCode.OK, known.StatusCode);
        Assert.Equal(HttpStatusCode.OK, unknown.StatusCode);
        Assert.Equal(await known.Content.ReadAsStringAsync(), await unknown.Content.ReadAsStringAsync());
    }

    [MongoFact]
    public async Task Forgot_password_stores_only_a_hash_with_an_expiry()
    {
        var prosumer = await api.SeedProsumerAsync();

        await api.CreateClient().PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest(prosumer.Email));

        // The email is sent from a background queue; wait for it to be processed.
        User user;
        var waited = 0;
        do
        {
            await Task.Delay(100);
            user = await api.UserAsync(prosumer.Id);
        } while (user.PasswordResetTokenHash is null && (waited += 100) < 5000);

        Assert.Matches("^[0-9a-f]{64}$", user.PasswordResetTokenHash!);
        Assert.InRange(user.PasswordResetExpiresAt!.Value, DateTime.UtcNow.AddMinutes(15), DateTime.UtcNow.AddMinutes(21));
    }

    [MongoFact]
    public async Task Forgot_password_does_nothing_for_an_inactive_account()
    {
        var pending = await api.SeedProsumerAsync(UserStatus.Pending);

        await api.CreateClient().PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest(pending.Email));
        await Task.Delay(500);

        Assert.Null((await api.UserAsync(pending.Id)).PasswordResetTokenHash);
    }

    [MongoFact]
    public async Task A_valid_token_resets_the_password_once_and_signs_out_old_sessions()
    {
        var prosumer = await api.SeedProsumerAsync();
        var oldSession = await api.ClientForAsync(prosumer);
        var token = await SeedResetTokenAsync(prosumer.Id, TimeSpan.FromMinutes(10));
        var client = api.CreateClient();

        var reset = await client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(token, NewPassword));

        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await oldSession.GetAsync("/api/users/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(prosumer.Email, ApiFixture.Password))).StatusCode);
        await api.LoginAsync(prosumer.Email, NewPassword);

        var reused = await client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(token, "Another-pass-77"));
        await reused.ShouldFailAsync(HttpStatusCode.BadRequest, "RESET_TOKEN_INVALID");
    }

    [MongoFact]
    public async Task An_expired_token_is_refused()
    {
        var prosumer = await api.SeedProsumerAsync();
        var token = await SeedResetTokenAsync(prosumer.Id, TimeSpan.FromMinutes(-1));

        var response = await api.CreateClient().PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(token, NewPassword));

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "RESET_TOKEN_INVALID");
    }

    [MongoFact]
    public async Task A_malformed_token_or_short_password_fails_validation()
    {
        var client = api.CreateClient();

        var badToken = await client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest("abc", NewPassword));
        var shortPassword = await client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(new string('a', 64), "short"));

        await badToken.ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
        await shortPassword.ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
    }

    [MongoFact]
    public async Task Changing_the_password_returns_a_new_session_and_ends_the_old_one()
    {
        var prosumer = await api.SeedProsumerAsync();
        var oldSession = await api.ClientForAsync(prosumer);

        var response = await oldSession.PostAsJsonAsync("/api/auth/change-password",
            new ChangePasswordRequest(ApiFixture.Password, NewPassword));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = (await response.Content.ReadFromJsonAsync<LoginResponse>())!;
        Assert.Equal(HttpStatusCode.Unauthorized, (await oldSession.GetAsync("/api/users/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await api.ClientWithToken(session.Token).GetAsync("/api/users/me")).StatusCode);
        Assert.Equal(1, (await api.UserAsync(prosumer.Id)).SecurityVersion);
    }

    // Puts a reset token on the account the way the background worker would, returning the raw token.
    private async Task<string> SeedResetTokenAsync(string userId, TimeSpan validFor)
    {
        var token = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
        await api.Collection<User>("Users").UpdateOneAsync(
            u => u.Id == userId,
            Builders<User>.Update
                .Set(u => u.PasswordResetTokenHash, PasswordRecoveryService.Hash(token))
                .Set(u => u.PasswordResetExpiresAt, DateTime.UtcNow.Add(validFor)));
        return token;
    }
}
