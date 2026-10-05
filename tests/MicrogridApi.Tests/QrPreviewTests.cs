using MicrogridApi.Common;
using System.Net;
using System.Net.Http.Json;
using MicrogridApi.DTOs.Activity;
using MicrogridApi.DTOs.Qr;
using MicrogridApi.Tests.Infrastructure;
using Xunit;

namespace MicrogridApi.Tests;

// POST /qr/preview is read-only; POST /qr/verify is still the only thing that completes a transfer.
[Collection(ApiCollection.Name)]
public class QrPreviewTests(ApiFixture api)
{
    [MongoFact]
    public async Task Preview_shows_the_booking_without_completing_it()
    {
        var (prosumerClient, operatorClient, reservationId, token) = await ApprovedWithTokenAsync();

        var preview = await (await operatorClient.PostAsJsonAsync("/api/qr/preview", new QrVerifyRequest(token, null, null)))
            .ReadAsync<QrVerifyResponse>();
        var stored = await (await prosumerClient.GetAsync($"/api/reservations/{reservationId}")).ShouldSucceedAsync();

        Assert.True(preview.Valid);
        Assert.Equal(reservationId, preview.ReservationId);
        Assert.Equal("Approved", preview.Status);
        Assert.Null(preview.CompletedAt);
        Assert.Equal("Approved", stored.Status);
    }

    [MongoFact]
    public async Task Confirming_after_a_preview_completes_the_transfer_once()
    {
        var (prosumerClient, operatorClient, reservationId, token) = await ApprovedWithTokenAsync();
        (await operatorClient.PostAsJsonAsync("/api/qr/preview", new QrVerifyRequest(token, null, null))).EnsureSuccessStatusCode();

        var verified = await (await operatorClient.PostAsJsonAsync("/api/qr/verify", new QrVerifyRequest(token, null, null)))
            .ReadAsync<QrVerifyResponse>();
        var previewAgain = await operatorClient.PostAsJsonAsync("/api/qr/preview", new QrVerifyRequest(token, null, null));

        Assert.Equal("Completed", verified.Status);
        Assert.NotNull(verified.CompletedAt);
        Assert.NotEqual(HttpStatusCode.OK, previewAgain.StatusCode);

        var inbox = await (await prosumerClient.GetAsync("/api/notifications")).ReadAsync<NotificationInboxResponse>();
        Assert.Contains(inbox.Items, n => n.ResourceId == reservationId && n.Message.Contains("complete"));
    }

    [MongoFact]
    public async Task Preview_rejects_a_tampered_token_and_non_operators()
    {
        var (prosumerClient, operatorClient, _, token) = await ApprovedWithTokenAsync();

        var tampered = await operatorClient.PostAsJsonAsync("/api/qr/preview", new QrVerifyRequest(token[..^4] + "AAAA", null, null));
        var byProsumer = await prosumerClient.PostAsJsonAsync("/api/qr/preview", new QrVerifyRequest(token, null, null));

        Assert.Equal(HttpStatusCode.BadRequest, tampered.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, byProsumer.StatusCode);
    }

    // An approved booking whose slot is under way (started 10 minutes ago), with its issued QR code.
    // Seeded directly: the API will not approve a booking whose slot has already started (BR-32).
    private async Task<(HttpClient Prosumer, HttpClient Operator, string ReservationId, string Token)> ApprovedWithTokenAsync()
    {
        var prosumer = await api.SeedProsumerAsync();
        var prosumerClient = await api.ClientForAsync(prosumer);
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, BusinessClock.Now.AddMinutes(-10));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, MicrogridApi.Models.ReservationStatus.Approved);

        (await operatorClient.PostAsync($"/api/qr/issue/{reservation.Id}", null)).EnsureSuccessStatusCode();
        var qr = await (await prosumerClient.GetAsync($"/api/qr/{reservation.Id}")).ReadAsync<QrTokenResponse>();

        return (prosumerClient, operatorClient, reservation.Id, qr.QrToken);
    }
}
