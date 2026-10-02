using System.Net;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;
using MicrogridApi.Tests.Infrastructure;
using Xunit;

namespace MicrogridApi.Tests;

// GET /reservations/view/{current|pending|history}: membership, order and paging.
[Collection(ApiCollection.Name)]
public class ReservationViewTests(ApiFixture api)
{
    [MongoFact]
    public async Task Each_booking_lands_in_the_right_view()
    {
        var station = await api.SeedStationAsync();
        var prosumer = await api.SeedProsumerAsync();
        var now = DateTime.UtcNow;

        var approvedFuture = await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, now.AddHours(5)), ReservationStatus.Approved);
        var approvedPast = await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, now.AddHours(-5)), ReservationStatus.Approved);
        var pendingFuture = await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, now.AddDays(2)), ReservationStatus.Pending);
        var pendingPast = await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, now.AddDays(-2)), ReservationStatus.Pending);
        var cancelled = await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, now.AddDays(3)), ReservationStatus.Cancelled);
        var completed = await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, now.AddDays(-1)), ReservationStatus.Completed);
        var client = await api.ClientForAsync(await api.SeedOperatorAsync());

        var current = await View(client, "current", prosumer.Nic);
        var pending = await View(client, "pending", prosumer.Nic);
        var history = await View(client, "history", prosumer.Nic);

        Assert.Equal([approvedFuture.Id], current.Items.Select(r => r.Id));
        Assert.Equal([pendingPast.Id, pendingFuture.Id], pending.Items.Select(r => r.Id)); // oldest slot first
        Assert.Equal(
            new[] { cancelled.Id, approvedPast.Id, completed.Id, pendingPast.Id }.OrderBy(id => id),
            history.Items.Select(r => r.Id).OrderBy(id => id));
        Assert.Equal(cancelled.Id, history.Items[0].Id); // newest slot first
    }

    [MongoFact]
    public async Task Views_are_paged_with_a_total()
    {
        var station = await api.SeedStationAsync();
        var prosumer = await api.SeedProsumerAsync();
        for (var i = 1; i <= 5; i++)
        {
            await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, DateTime.UtcNow.AddDays(1).AddHours(i)), ReservationStatus.Pending);
        }

        var client = await api.ClientForAsync(await api.SeedOperatorAsync());

        var second = await View(client, "pending", prosumer.Nic, page: 2, pageSize: 2);
        var last = await View(client, "pending", prosumer.Nic, page: 3, pageSize: 2);

        Assert.Equal(5, second.Total);
        Assert.Equal(2, second.Items.Count);
        Assert.Single(last.Items);
    }

    [MongoFact]
    public async Task A_prosumer_only_sees_their_own_bookings()
    {
        var station = await api.SeedStationAsync();
        var mine = await api.SeedProsumerAsync();
        var theirs = await api.SeedProsumerAsync();
        await api.SeedReservationAsync(mine.Nic, await api.SeedSlotAsync(station.Id, DateTime.UtcNow.AddDays(1)), ReservationStatus.Pending);
        await api.SeedReservationAsync(theirs.Nic, await api.SeedSlotAsync(station.Id, DateTime.UtcNow.AddDays(1)), ReservationStatus.Pending);
        var client = await api.ClientForAsync(mine);

        var page = await View(client, "pending", theirs.Nic);

        Assert.All(page.Items, r => Assert.Equal(mine.Nic, r.Nic));
        Assert.Equal(1, page.Total);
    }

    [MongoFact]
    public async Task Bad_view_or_paging_is_rejected()
    {
        var client = await api.ClientForAsync(await api.SeedOperatorAsync());

        await (await client.GetAsync("/api/reservations/view/upcoming")).ShouldFailAsync(HttpStatusCode.BadRequest, "UNKNOWN_VIEW");
        await (await client.GetAsync("/api/reservations/view/pending?pageSize=0")).ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
        await (await client.GetAsync("/api/reservations/view/pending?pageSize=101")).ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
    }

    private static async Task<ReservationPageResponse> View(HttpClient client, string view, string nic, int page = 1, int pageSize = 20) =>
        await (await client.GetAsync($"/api/reservations/view/{view}?nic={nic}&page={page}&pageSize={pageSize}"))
            .ReadAsync<ReservationPageResponse>();
}
