using MicrogridApi.Common;
using System.Net;
using MicrogridApi.DTOs.Dashboards;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;
using MicrogridApi.Tests.Infrastructure;
using Xunit;

namespace MicrogridApi.Tests;

// Dashboard counts and the booking monitor (GET /bookings/search).
[Collection(ApiCollection.Name)]
public class DashboardAndSearchTests(ApiFixture api)
{
    // ---- prosumer dashboard ----

    [MongoFact]
    public async Task Prosumer_dashboard_counts_pending_approved_and_future_bookings()
    {
        var station = await api.SeedStationAsync();
        var prosumer = await api.SeedProsumerAsync();
        var today = BusinessClock.Today;
        await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, today.AddDays(2).AddHours(9)), ReservationStatus.Pending);
        await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, today.AddDays(3).AddHours(9)), ReservationStatus.Approved);
        await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, today.AddDays(-2).AddHours(9)), ReservationStatus.Approved);
        await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, today.AddDays(4).AddHours(9)), ReservationStatus.Cancelled);
        await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, today.AddDays(5).AddHours(9)), ReservationStatus.Rejected);
        var client = await api.ClientForAsync(prosumer);

        var dashboard = await (await client.GetAsync($"/api/dashboard/prosumer/{prosumer.Nic}")).ReadAsync<ProsumerDashboardResponse>();

        Assert.Equal(prosumer.Nic, dashboard.Nic);
        Assert.Equal(1, dashboard.PendingCount);
        Assert.Equal(3, dashboard.ActiveCount);        // pending + approved, past ones included
        Assert.Equal(1, dashboard.ApprovedFutureCount); // the approved booking in the past does not count
    }

    [MongoFact]
    public async Task Prosumer_dashboard_is_empty_for_a_new_account()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);

        var dashboard = await (await client.GetAsync($"/api/dashboard/prosumer/{prosumer.Nic}")).ReadAsync<ProsumerDashboardResponse>();

        Assert.Equal(0, dashboard.ActiveCount);
        Assert.Equal(0, dashboard.PendingCount);
        Assert.Equal(0, dashboard.ApprovedFutureCount);
    }

    [MongoFact]
    public async Task Prosumer_cannot_open_another_prosumers_dashboard()
    {
        var client = await api.ClientForAsync(await api.SeedProsumerAsync());
        var other = await api.SeedProsumerAsync();

        var response = await client.GetAsync($"/api/dashboard/prosumer/{other.Nic}");

        await response.ShouldFailAsync(HttpStatusCode.Forbidden, "NOT_RESERVATION_OWNER");
    }

    [MongoFact]
    public async Task Dashboard_for_an_unknown_nic_is_not_found()
    {
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());

        var response = await operatorClient.GetAsync("/api/dashboard/prosumer/900000001V");

        await response.ShouldFailAsync(HttpStatusCode.NotFound, "PROSUMER_NOT_FOUND");
    }

    // ---- operator dashboard ----

    [MongoFact]
    public async Task Operator_dashboard_lists_the_pending_queue_for_one_station()
    {
        var station = await api.SeedStationAsync();
        var elsewhere = await api.SeedStationAsync();
        var prosumer = await api.SeedProsumerAsync();
        var today = BusinessClock.Today;
        await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, today.AddDays(2).AddHours(9)), ReservationStatus.Pending);
        await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, today.AddDays(3).AddHours(9)), ReservationStatus.Pending);
        await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, today.AddDays(4).AddHours(9)), ReservationStatus.Approved);
        await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(elsewhere.Id, today.AddDays(2).AddHours(9)), ReservationStatus.Pending);
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());

        var dashboard = await (await operatorClient.GetAsync($"/api/dashboard/operator/{station.Id}")).ReadAsync<OperatorDashboardResponse>();

        Assert.Equal(station.StationName, dashboard.StationName);
        Assert.Equal(2, dashboard.PendingCount);
        Assert.Equal(2, dashboard.PendingReservations.Count);
        Assert.Equal(1, dashboard.ApprovedFutureCount);
        Assert.All(dashboard.PendingReservations, r => Assert.Equal(station.Id, r.StationId));
    }

    [MongoFact]
    public async Task Operator_dashboard_is_closed_to_prosumers()
    {
        var station = await api.SeedStationAsync();
        var client = await api.ClientForAsync(await api.SeedProsumerAsync());

        var response = await client.GetAsync($"/api/dashboard/operator/{station.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [MongoFact]
    public async Task Operator_dashboard_for_an_unknown_station_is_not_found()
    {
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());

        var response = await operatorClient.GetAsync("/api/dashboard/operator/64b7f0f0f0f0f0f0f0f0f0f0");

        await response.ShouldFailAsync(HttpStatusCode.NotFound, "STATION_NOT_FOUND");
    }

    // ---- booking monitor ----

    [MongoFact]
    public async Task Search_filters_by_status_and_station()
    {
        var station = await api.SeedStationAsync();
        var other = await api.SeedStationAsync();
        var prosumer = await api.SeedProsumerAsync();
        var today = BusinessClock.Today;
        var pending = await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, today.AddDays(1).AddHours(9)), ReservationStatus.Pending);
        await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, today.AddDays(2).AddHours(9)), ReservationStatus.Approved);
        await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(other.Id, today.AddDays(1).AddHours(9)), ReservationStatus.Pending);
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());

        var result = await (await operatorClient.GetAsync(
            $"/api/bookings/search?nic={prosumer.Nic}&stationId={station.Id}&status=pending")).ReadAsync<List<ReservationResponse>>();

        var only = Assert.Single(result);
        Assert.Equal(pending.Id, only.Id);
    }

    [MongoFact]
    public async Task Search_date_range_is_inclusive_on_both_ends()
    {
        var station = await api.SeedStationAsync();
        var prosumer = await api.SeedProsumerAsync();
        var day = BusinessClock.Today;
        foreach (var offset in new[] { 1, 2, 3, 4 })
        {
            await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, day.AddDays(offset).AddHours(9)), ReservationStatus.Pending);
        }

        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var from = day.AddDays(2).ToString("yyyy-MM-dd");
        var to = day.AddDays(3).ToString("yyyy-MM-dd");

        var result = await (await operatorClient.GetAsync(
            $"/api/bookings/search?nic={prosumer.Nic}&dateFrom={from}&dateTo={to}")).ReadAsync<List<ReservationResponse>>();

        Assert.Equal(2, result.Count);
        Assert.All(result, r => Assert.InRange(r.ReservationDate.Date, day.AddDays(2), day.AddDays(3)));
    }

    [MongoFact]
    public async Task Search_results_are_newest_date_first()
    {
        var station = await api.SeedStationAsync();
        var prosumer = await api.SeedProsumerAsync();
        var day = BusinessClock.Today;
        foreach (var offset in new[] { 3, 1, 2 })
        {
            await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, day.AddDays(offset).AddHours(9)), ReservationStatus.Pending);
        }

        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var result = await (await operatorClient.GetAsync($"/api/bookings/search?nic={prosumer.Nic}")).ReadAsync<List<ReservationResponse>>();

        Assert.Equal(result.OrderByDescending(r => r.ReservationDate).Select(r => r.Id), result.Select(r => r.Id));
    }

    [MongoFact]
    public async Task Search_rejects_a_bad_station_id_or_status()
    {
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());

        var badStation = await operatorClient.GetAsync("/api/bookings/search?stationId=nope");
        var badStatus = await operatorClient.GetAsync("/api/bookings/search?status=Banana");

        Assert.Equal(HttpStatusCode.BadRequest, badStation.StatusCode);
        await badStatus.ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
    }

    [MongoFact]
    public async Task A_prosumer_searching_only_sees_their_own_bookings()
    {
        var station = await api.SeedStationAsync();
        var mine = await api.SeedProsumerAsync();
        var theirs = await api.SeedProsumerAsync();
        var day = BusinessClock.Today;
        await api.SeedReservationAsync(mine.Nic, await api.SeedSlotAsync(station.Id, day.AddDays(1).AddHours(9)), ReservationStatus.Pending);
        await api.SeedReservationAsync(theirs.Nic, await api.SeedSlotAsync(station.Id, day.AddDays(2).AddHours(9)), ReservationStatus.Pending);
        var client = await api.ClientForAsync(mine);

        var result = await (await client.GetAsync($"/api/bookings/search?nic={theirs.Nic}")).ReadAsync<List<ReservationResponse>>();

        Assert.All(result, r => Assert.Equal(mine.Nic, r.Nic));
    }
}
