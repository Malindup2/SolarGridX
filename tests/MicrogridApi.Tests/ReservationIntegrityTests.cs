using MicrogridApi.Common;
using System.Net;
using System.Net.Http.Json;
using MicrogridApi.DTOs.Qr;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;
using MicrogridApi.Tests.Infrastructure;
using Xunit;

namespace MicrogridApi.Tests;

// The rules that stop two people, or two requests, from corrupting a booking:
// atomic capacity, atomic completion, overlap, QR timing and edit conflicts.
[Collection(ApiCollection.Name)]
public class ReservationIntegrityTests(ApiFixture api)
{
    private static DateTime Now => BusinessClock.Now;

    // ---- BR-13: the last bay can never be sold twice ----

    [MongoFact]
    public async Task Eight_prosumers_racing_for_the_last_bay_produce_exactly_one_booking()
    {
        var station = await api.SeedStationAsync(batteryBays: 1);
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));
        var people = new List<(ApiFixture.Account Account, HttpClient Client)>();
        for (var i = 0; i < 8; i++)
        {
            var account = await api.SeedProsumerAsync();
            people.Add((account, await api.ClientForAsync(account)));
        }

        var responses = await Task.WhenAll(people.Select(p =>
            p.Client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(p.Account.Nic, slot))));

        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(7, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        Assert.Equal(1, await api.ReservedCountAsync(slot.Id));
    }

    [MongoFact]
    public async Task A_full_slot_stays_full_after_a_failed_booking()
    {
        var station = await api.SeedStationAsync(batteryBays: 2);
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));
        var people = new List<(ApiFixture.Account Account, HttpClient Client)>();
        for (var i = 0; i < 5; i++)
        {
            var account = await api.SeedProsumerAsync();
            people.Add((account, await api.ClientForAsync(account)));
        }

        var responses = await Task.WhenAll(people.Select(p =>
            p.Client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(p.Account.Nic, slot))));

        Assert.Equal(2, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(2, await api.ReservedCountAsync(slot.Id)); // never above the bays, never negative
    }

    // ---- completion happens once ----

    [MongoFact]
    public async Task Eight_scans_at_once_complete_the_transfer_exactly_once()
    {
        var (_, _, _, token) = await ApprovedInProgressAsync();
        var scanners = new List<HttpClient>();
        for (var i = 0; i < 8; i++)
        {
            scanners.Add(await api.ClientForAsync(await api.SeedOperatorAsync()));
        }

        var responses = await Task.WhenAll(scanners.Select(c =>
            c.PostAsJsonAsync("/api/qr/verify", new QrVerifyRequest(token, null, null))));

        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.OK));
        foreach (var loser in responses.Where(r => r.StatusCode != HttpStatusCode.OK))
        {
            await loser.ShouldFailAsync(HttpStatusCode.Conflict, "QR_TOKEN_ALREADY_USED");
        }
    }

    [MongoFact]
    public async Task Two_operators_approving_at_once_decide_it_once()
    {
        var (_, _, reservation) = await PendingAsync(Now.AddHours(30));
        var a = await api.ClientForAsync(await api.SeedOperatorAsync());
        var b = await api.ClientForAsync(await api.SeedOperatorAsync());

        var responses = await Task.WhenAll(
            a.PatchAsync($"/api/reservations/{reservation.Id}/approve"),
            b.PatchAsync($"/api/reservations/{reservation.Id}/approve"));

        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.OK));
        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
    }

    // ---- BR-31: no overlapping bookings for one prosumer ----

    [MongoFact]
    public async Task A_prosumer_cannot_book_two_overlapping_slots()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);
        var station = await api.SeedStationAsync();
        var other = await api.SeedStationAsync();
        var day = Now.Date.AddDays(2);
        var first = await api.SeedSlotAsync(station.Id, day.AddHours(10));
        var overlapping = await api.SeedSlotAsync(other.Id, day.AddHours(10).AddMinutes(30));

        (await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, first))).EnsureSuccessStatusCode();
        var second = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, overlapping));

        await second.ShouldFailAsync(HttpStatusCode.Conflict, "RESERVATION_OVERLAP");
        Assert.Equal(0, await api.ReservedCountAsync(overlapping.Id)); // no bay taken by the refused booking
    }

    [MongoFact]
    public async Task Back_to_back_slots_do_not_overlap()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);
        var station = await api.SeedStationAsync();
        var day = Now.Date.AddDays(2);
        var first = await api.SeedSlotAsync(station.Id, day.AddHours(10));
        var next = await api.SeedSlotAsync(station.Id, day.AddHours(11));

        (await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, first))).EnsureSuccessStatusCode();
        var second = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, next));

        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
    }

    [MongoFact]
    public async Task A_cancelled_booking_no_longer_blocks_the_time()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);
        var station = await api.SeedStationAsync();
        var first = await api.SeedSlotAsync(station.Id, Now.AddHours(40));
        var sameTime = await api.SeedSlotAsync((await api.SeedStationAsync()).Id, Now.AddHours(40));
        var created = await (await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, first)))
            .ShouldSucceedAsync(HttpStatusCode.Created);
        (await client.PatchAsync($"/api/reservations/{created.Id}/cancel")).EnsureSuccessStatusCode();

        var again = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, sameTime));

        Assert.Equal(HttpStatusCode.Created, again.StatusCode);
    }

    [MongoFact]
    public async Task Rescheduling_onto_an_overlapping_time_is_refused()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);
        var station = await api.SeedStationAsync();
        var day = Now.Date.AddDays(2);
        var held = await api.SeedSlotAsync(station.Id, day.AddHours(9));
        var movable = await api.SeedSlotAsync(station.Id, day.AddHours(14));
        var target = await api.SeedSlotAsync((await api.SeedStationAsync()).Id, day.AddHours(9).AddMinutes(30));
        (await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, held))).EnsureSuccessStatusCode();
        var moving = await (await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, movable)))
            .ShouldSucceedAsync(HttpStatusCode.Created);

        var response = await client.PatchAsJsonAsync($"/api/reservations/{moving.Id}/reschedule", new RescheduleReservationRequest(target.Id));

        await response.ShouldFailAsync(HttpStatusCode.Conflict, "RESERVATION_OVERLAP");
    }

    // ---- BR-32 / BR-33: timing around the slot start ----

    [MongoFact]
    public async Task A_booking_cannot_be_approved_once_its_slot_has_started()
    {
        var (_, _, reservation) = await PendingAsync(Now.AddMinutes(-10));
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());

        var approve = await operatorClient.PatchAsync($"/api/reservations/{reservation.Id}/approve");
        var reject = await operatorClient.PatchAsJsonAsync($"/api/reservations/{reservation.Id}/reject", new RejectReservationRequest("Too late"));

        await approve.ShouldFailAsync(HttpStatusCode.Conflict, "RESERVATION_ALREADY_STARTED");
        Assert.Equal("Rejected", (await reject.ShouldSucceedAsync()).Status); // it can still be cleared from the queue
    }

    [MongoFact]
    public async Task A_qr_code_does_not_work_before_its_slot_starts()
    {
        var prosumer = await api.SeedProsumerAsync();
        var prosumerClient = await api.ClientForAsync(prosumer);
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddHours(30));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Approved);
        (await operatorClient.PostAsync($"/api/qr/issue/{reservation.Id}", null)).EnsureSuccessStatusCode();
        var token = (await (await prosumerClient.GetAsync($"/api/qr/{reservation.Id}")).ReadAsync<QrTokenResponse>()).QrToken;

        var preview = await operatorClient.PostAsJsonAsync("/api/qr/preview", new QrVerifyRequest(token, null, null));
        var verify = await operatorClient.PostAsJsonAsync("/api/qr/verify", new QrVerifyRequest(token, null, null));

        var error = await preview.ShouldFailAsync(HttpStatusCode.Conflict, "QR_TOKEN_NOT_YET_VALID");
        Assert.Contains(error.Details!, d => d.StartsWith("slot starts at"));
        await verify.ShouldFailAsync(HttpStatusCode.Conflict, "QR_TOKEN_NOT_YET_VALID");
    }

    // ---- BR-16: editing an approved booking ----

    [MongoFact]
    public async Task Moving_an_approved_booking_sends_it_back_for_approval_and_swaps_the_bays()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var station = await api.SeedStationAsync();
        var original = await api.SeedSlotAsync(station.Id, Now.AddHours(30));
        var target = await api.SeedSlotAsync(station.Id, Now.AddHours(40));
        var created = await (await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, original)))
            .ShouldSucceedAsync(HttpStatusCode.Created);
        (await operatorClient.PatchAsync($"/api/reservations/{created.Id}/approve")).EnsureSuccessStatusCode();

        var moved = await (await client.PatchAsJsonAsync($"/api/reservations/{created.Id}/reschedule", new RescheduleReservationRequest(target.Id)))
            .ShouldSucceedAsync();

        Assert.Equal("Pending", moved.Status);
        Assert.Equal(target.Id, moved.SlotId);
        Assert.Equal(0, await api.ReservedCountAsync(original.Id));
        Assert.Equal(1, await api.ReservedCountAsync(target.Id));
        // And it can be approved again.
        Assert.Equal("Approved", (await (await operatorClient.PatchAsync($"/api/reservations/{created.Id}/approve")).ShouldSucceedAsync()).Status);
    }

    [MongoFact]
    public async Task An_approved_booking_still_needs_twelve_hours_notice_to_change()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddHours(6));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Approved);

        var response = await client.PutAsJsonAsync($"/api/reservations/{reservation.Id}", new UpdateReservationRequest(12));

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "RESERVATION_NOTICE_TOO_SHORT");
    }

    // ---- edit conflicts ----

    [MongoFact]
    public async Task Saving_over_someone_elses_change_is_refused_with_the_version_check()
    {
        var (prosumer, client, reservation) = await PendingAsync(Now.AddHours(30));
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var seenByFirstEditor = reservation.UpdatedAt;

        // A second person changes the booking after the first opened it.
        (await operatorClient.PutAsJsonAsync($"/api/reservations/{reservation.Id}", new UpdateReservationRequest(20))).EnsureSuccessStatusCode();
        var stale = await client.PutAsJsonAsync($"/api/reservations/{reservation.Id}", new UpdateReservationRequest(25, seenByFirstEditor));

        await stale.ShouldFailAsync(HttpStatusCode.Conflict, "RESERVATION_CHANGED");
        Assert.Equal(20, (await (await client.GetAsync($"/api/reservations/{reservation.Id}")).ShouldSucceedAsync()).EnergyKwh);
        _ = prosumer;
    }

    [MongoFact]
    public async Task Saving_with_the_current_version_succeeds_and_the_version_is_optional()
    {
        var (_, client, reservation) = await PendingAsync(Now.AddHours(30));

        var withVersion = await client.PutAsJsonAsync($"/api/reservations/{reservation.Id}", new UpdateReservationRequest(11, reservation.UpdatedAt));
        var latest = await withVersion.ShouldSucceedAsync();
        var withoutVersion = await client.PutAsJsonAsync($"/api/reservations/{reservation.Id}", new UpdateReservationRequest(12));

        Assert.Equal(11, latest.EnergyKwh);
        Assert.Equal(12, (await withoutVersion.ShouldSucceedAsync()).EnergyKwh);
    }

    // ---- helpers ----

    private async Task<(ApiFixture.Account Prosumer, HttpClient Client, ReservationResponse Reservation)> PendingAsync(DateTime slotStart)
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, slotStart);
        var seeded = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Pending);
        var reservation = await (await client.GetAsync($"/api/reservations/{seeded.Id}")).ShouldSucceedAsync();
        return (prosumer, client, reservation);
    }

    private async Task<(HttpClient Prosumer, HttpClient Operator, string ReservationId, string Token)> ApprovedInProgressAsync()
    {
        var prosumer = await api.SeedProsumerAsync();
        var prosumerClient = await api.ClientForAsync(prosumer);
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var slot = await api.SeedSlotAsync((await api.SeedStationAsync()).Id, Now.AddMinutes(-10));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Approved);
        (await operatorClient.PostAsync($"/api/qr/issue/{reservation.Id}", null)).EnsureSuccessStatusCode();
        var token = (await (await prosumerClient.GetAsync($"/api/qr/{reservation.Id}")).ReadAsync<QrTokenResponse>()).QrToken;
        return (prosumerClient, operatorClient, reservation.Id, token);
    }
}
