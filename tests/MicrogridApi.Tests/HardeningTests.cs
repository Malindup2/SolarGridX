using System.Net;
using System.Net.Http.Json;
using MicrogridApi.DTOs.Auth;
using MicrogridApi.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace MicrogridApi.Tests;

// Correlation ids, the Mongo health check and sign-in rate limiting.
[Collection(ApiCollection.Name)]
public class HardeningTests(ApiFixture api)
{
    [MongoFact]
    public async Task Every_response_carries_a_fresh_correlation_id()
    {
        var client = api.CreateClient();

        var first = await client.GetAsync("/api/reservations");
        var second = await client.GetAsync("/api/reservations");

        var firstId = Assert.Single(first.Headers.GetValues("X-Correlation-ID"));
        var secondId = Assert.Single(second.Headers.GetValues("X-Correlation-ID"));
        Assert.Matches("^[0-9a-f]{32}$", firstId);
        Assert.NotEqual(firstId, secondId);
    }

    [MongoFact]
    public async Task A_client_supplied_correlation_id_is_ignored()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("X-Correlation-ID", "forged-by-client");

        var response = await api.CreateClient().SendAsync(request);

        Assert.NotEqual("forged-by-client", Assert.Single(response.Headers.GetValues("X-Correlation-ID")));
    }

    [MongoFact]
    public async Task Health_pings_mongo()
    {
        var response = await api.CreateClient().GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }

    [MongoFact]
    public async Task The_swagger_document_still_builds_with_every_endpoint()
    {
        var response = await api.CreateClient().GetAsync("/swagger/v1/swagger.json");
        var json = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        foreach (var path in new[] { "/api/qr/preview", "/api/users/me/avatar", "/api/exports/{kind}.csv", "/api/notifications", "/api/auth/forgot-password", "/api/reservations/view/{view}" })
        {
            Assert.Contains($"\"{path}\"", json);
        }
    }

    [MongoFact]
    public async Task Sign_in_is_rate_limited_per_client()
    {
        // A host of its own with a limit of 3 per minute. The shared fixture's host has already
        // read its (very high) limit, so changing the variable here does not affect other tests.
        var previous = Environment.GetEnvironmentVariable("RateLimiting__AuthPermitLimit");
        Environment.SetEnvironmentVariable("RateLimiting__AuthPermitLimit", "3");
        await using var strict = new WebApplicationFactory<Program>();
        HttpClient client;
        try
        {
            client = strict.CreateClient();
        }
        finally
        {
            Environment.SetEnvironmentVariable("RateLimiting__AuthPermitLimit", previous);
        }

        var wrong = new LoginRequest("nobody@test.local", "not-the-password");
        for (var attempt = 0; attempt < 3; attempt++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", wrong)).StatusCode);
        }

        var blocked = await client.PostAsJsonAsync("/api/auth/login", wrong);

        await blocked.ShouldFailAsync(HttpStatusCode.TooManyRequests, "TOO_MANY_ATTEMPTS");
    }
}
