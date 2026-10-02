using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using MicrogridApi.DTOs.Users;
using MicrogridApi.Tests.Infrastructure;
using Xunit;

namespace MicrogridApi.Tests;

// GET/PUT /users/me, the profile photo and a prosumer closing their own account.
[Collection(ApiCollection.Name)]
public class ProfileTests(ApiFixture api)
{
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];
    private static readonly byte[] Gif = "GIF89a\0\0"u8.ToArray();

    [MongoFact]
    public async Task Every_role_can_read_their_own_profile()
    {
        var prosumer = await api.SeedProsumerAsync();
        var operatorAccount = await api.SeedOperatorAsync();

        var mine = await (await (await api.ClientForAsync(prosumer)).GetAsync("/api/users/me")).ReadAsync<ProfileResponse>();
        var theirs = await (await (await api.ClientForAsync(operatorAccount)).GetAsync("/api/users/me")).ReadAsync<ProfileResponse>();

        Assert.Equal(prosumer.Nic, mine.Nic);
        Assert.Equal("Prosumer", mine.Role);
        Assert.Equal("GridOperator", theirs.Role);
        Assert.Null(theirs.AvatarVersion);
    }

    [MongoFact]
    public async Task Updating_the_profile_saves_the_new_details()
    {
        var operatorAccount = await api.SeedOperatorAsync();
        var client = await api.ClientForAsync(operatorAccount);

        var response = await client.PutAsJsonAsync("/api/users/me",
            new UpdateProfileRequest("Renamed Operator", operatorAccount.Email.ToUpperInvariant(), "0771234567", "Galle"));

        var profile = await response.ReadAsync<ProfileResponse>();
        Assert.Equal("Renamed Operator", profile.FullName);
        Assert.Equal(operatorAccount.Email, profile.Email); // stored lowercase
        Assert.Equal("0771234567", profile.Phone);
    }

    [MongoFact]
    public async Task An_email_another_account_uses_is_refused()
    {
        var first = await api.SeedOperatorAsync();
        var second = await api.SeedOperatorAsync();
        var client = await api.ClientForAsync(first);

        var response = await client.PutAsJsonAsync("/api/users/me", new UpdateProfileRequest("Name", second.Email, null, null));

        await response.ShouldFailAsync(HttpStatusCode.Conflict, "EMAIL_ALREADY_REGISTERED");
    }

    [MongoFact]
    public async Task A_png_photo_is_stored_and_served_back()
    {
        var client = await api.ClientForAsync(await api.SeedOperatorAsync());

        var upload = await client.PutAsync("/api/users/me/avatar", Photo(Png, "me.png"));
        var profile = await upload.ReadAsync<ProfileResponse>();
        var download = await client.GetAsync("/api/users/me/avatar");

        Assert.NotNull(profile.AvatarVersion);
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal("image/png", download.Content.Headers.ContentType!.MediaType);
        Assert.Equal(Png, await download.Content.ReadAsByteArrayAsync());
        Assert.Contains("no-store", download.Headers.CacheControl!.ToString());
    }

    [MongoFact]
    public async Task The_photo_type_comes_from_the_bytes_not_the_file_name()
    {
        var client = await api.ClientForAsync(await api.SeedOperatorAsync());

        var response = await client.PutAsync("/api/users/me/avatar", Photo(Gif, "looks-like.png"));

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "AVATAR_TYPE_NOT_ALLOWED");
    }

    [MongoFact]
    public async Task A_photo_over_one_megabyte_is_refused()
    {
        var client = await api.ClientForAsync(await api.SeedOperatorAsync());
        var tooBig = new byte[1024 * 1024 + 1];
        Png.CopyTo(tooBig, 0);

        var response = await client.PutAsync("/api/users/me/avatar", Photo(tooBig, "big.png"));

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "AVATAR_TOO_LARGE");
    }

    [MongoFact]
    public async Task Removing_the_photo_leaves_no_avatar()
    {
        var client = await api.ClientForAsync(await api.SeedOperatorAsync());
        (await client.PutAsync("/api/users/me/avatar", Photo(Png, "me.png"))).EnsureSuccessStatusCode();

        var removed = await (await client.DeleteAsync("/api/users/me/avatar")).ReadAsync<ProfileResponse>();

        Assert.Null(removed.AvatarVersion);
        await (await client.GetAsync("/api/users/me/avatar")).ShouldFailAsync(HttpStatusCode.NotFound, "AVATAR_NOT_FOUND");
    }

    [MongoFact]
    public async Task Staff_can_see_another_users_photo_but_prosumers_cannot()
    {
        var owner = await api.SeedOperatorAsync();
        (await (await api.ClientForAsync(owner)).PutAsync("/api/users/me/avatar", Photo(Png, "me.png"))).EnsureSuccessStatusCode();

        var asAdmin = await (await api.ClientForAsync(ApiFixture.Admin)).GetAsync($"/api/users/{owner.Id}/avatar");
        var asProsumer = await (await api.ClientForAsync(await api.SeedProsumerAsync())).GetAsync($"/api/users/{owner.Id}/avatar");

        Assert.Equal(HttpStatusCode.OK, asAdmin.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, asProsumer.StatusCode);
    }

    [MongoFact]
    public async Task A_prosumer_can_close_their_own_account()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);

        var response = await client.PostAsync("/api/users/me/deactivation-request", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/users/me")).StatusCode);
    }

    [MongoFact]
    public async Task Staff_cannot_close_their_own_account()
    {
        var client = await api.ClientForAsync(await api.SeedOperatorAsync());

        var response = await client.PostAsync("/api/users/me/deactivation-request", null);

        await response.ShouldFailAsync(HttpStatusCode.Forbidden, "DEACTIVATION_REQUEST_PROSUMER_ONLY");
    }

    private static MultipartFormDataContent Photo(byte[] bytes, string name)
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        return new MultipartFormDataContent { { file, "file", name } };
    }
}
