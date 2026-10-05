using MicrogridApi.Common;
using System.Net;
using System.Net.Http.Json;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;
using MicrogridApi.Tests.Infrastructure;
using Xunit;

namespace MicrogridApi.Tests;

// The Pending -> Approved / Rejected / Cancelled lifecycle and who may drive it.
[Collection(ApiCollection.Name)]
public class ReservationLifecycleTests(ApiFixture api)
{
    [MongoFact]
    public async Task Prosumer_books_operator_approves_and_the_qr_is_issued()
    {
        var prosumer = await api.SeedProsumerAsync();
        var prosumerClient = await api.ClientForAsync(prosumer);
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, BusinessClock.Now.AddHours(30));

        var created = await (await prosumerClient.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot)))
            .ShouldSucceedAsync(HttpStatusCode.Created);
        var approved = await (await operatorClient.PatchAsync($"/api/reservations/{created.Id}/approve")).ShouldSucceedAsync();

        Assert.Equal("Approved", approved.Status);
        Assert.True(approved.QrEligible);
        Assert.False(string.IsNullOrWhiteSpace(approved.ApprovedBy));

        var qr = await prosumerClient.GetAsync($"/api/qr/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, qr.StatusCode);
    }

    [MongoFact]
    public async Task Approving_twice_is_rejected()
    {
        var (reservation, operatorClient) = await PendingReservationAsync();
        (await operatorClient.PatchAsync($"/api/reservations/{reservation.Id}/approve")).EnsureSuccessStatusCode();

        var again = await operatorClient.PatchAsync($"/api/reservations/{reservation.Id}/approve");

        await again.ShouldFailAsync(HttpStatusCode.Conflict, "RESERVATION_ALREADY_DECIDED");
    }

    [MongoFact]
    public async Task Rejecting_stores_the_reason_and_frees_the_slot()
    {
        var (reservation, operatorClient) = await PendingReservationAsync();

        var response = await operatorClient.PatchAsJsonAsync(
            $"/api/reservations/{reservation.Id}/reject", new RejectReservationRequest("Maintenance window"));

        var rejected = await response.ShouldSucceedAsync();
        Assert.Equal("Rejected", rejected.Status);
        Assert.Equal("Maintenance window", rejected.RejectionReason);
        Assert.Equal(0, await api.ReservedCountAsync(reservation.SlotId));
    }

    [MongoFact]
    public async Task Rejecting_without_a_reason_fails_validation()
    {
        var (reservation, operatorClient) = await PendingReservationAsync();

        var response = await operatorClient.PatchAsJsonAsync(
            $"/api/reservations/{reservation.Id}/reject", new RejectReservationRequest(""));

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
    }

    [MongoFact]
    public async Task A_rejected_reservation_cannot_be_approved()
    {
        var (reservation, operatorClient) = await PendingReservationAsync();
        (await operatorClient.PatchAsJsonAsync(
            $"/api/reservations/{reservation.Id}/reject", new RejectReservationRequest("No capacity"))).EnsureSuccessStatusCode();

        var response = await operatorClient.PatchAsync($"/api/reservations/{reservation.Id}/approve");

        await response.ShouldFailAsync(HttpStatusCode.Conflict, "RESERVATION_ALREADY_DECIDED");
    }

    [MongoFact]
    public async Task Prosumer_cannot_approve_or_reject()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, BusinessClock.Now.AddHours(30));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Pending);

        var approve = await client.PatchAsync($"/api/reservations/{reservation.Id}/approve");
        var reject = await client.PatchAsJsonAsync($"/api/reservations/{reservation.Id}/reject", new RejectReservationRequest("x"));

        Assert.Equal(HttpStatusCode.Forbidden, approve.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, reject.StatusCode);
    }

    [MongoFact]
    public async Task Backoffice_can_cancel_on_a_prosumers_behalf()
    {
        var prosumer = await api.SeedProsumerAsync();
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, BusinessClock.Now.AddHours(30));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Pending);
        var admin = await LoginAdminAsync();

        var response = await admin.PatchAsync($"/api/reservations/{reservation.Id}/cancel");

        Assert.Equal("Cancelled", (await response.ShouldSucceedAsync()).Status);
    }

    [MongoFact]
    public async Task An_unknown_or_malformed_id_is_not_found()
    {
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());

        var malformed = await operatorClient.GetAsync("/api/reservations/not-an-id");
        var missing = await operatorClient.GetAsync("/api/reservations/64b7f0f0f0f0f0f0f0f0f0f0");

        await malformed.ShouldFailAsync(HttpStatusCode.NotFound, "RESERVATION_NOT_FOUND");
        await missing.ShouldFailAsync(HttpStatusCode.NotFound, "RESERVATION_NOT_FOUND");
    }

    [MongoFact]
    public async Task Requests_without_a_token_get_the_standard_401_envelope()
    {
        var response = await api.CreateClient().GetAsync("/api/reservations");

        await response.ShouldFailAsync(HttpStatusCode.Unauthorized, "UNAUTHORIZED");
    }

    [MongoFact]
    public async Task A_prosumer_only_ever_lists_their_own_reservations()
    {
        var station = await api.SeedStationAsync();
        var mine = await api.SeedProsumerAsync();
        var theirs = await api.SeedProsumerAsync();
        var slotA = await api.SeedSlotAsync(station.Id, BusinessClock.Now.AddHours(30));
        var slotB = await api.SeedSlotAsync(station.Id, BusinessClock.Now.AddHours(32));
        await api.SeedReservationAsync(mine.Nic, slotA, ReservationStatus.Pending);
        await api.SeedReservationAsync(theirs.Nic, slotB, ReservationStatus.Pending);
        var client = await api.ClientForAsync(mine);

        // Asking for someone else's NIC must not widen the result.
        var list = await (await client.GetAsync($"/api/reservations?nic={theirs.Nic}")).ReadAsync<List<ReservationResponse>>();

        Assert.All(list, r => Assert.Equal(mine.Nic, r.Nic));
        Assert.Single(list);
    }

    [MongoFact]
    public async Task List_rejects_an_unknown_status_filter()
    {
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());

        var response = await operatorClient.GetAsync("/api/reservations?status=Banana");

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
    }

    // ---- helpers ----

    private async Task<(EnergyReservation Reservation, HttpClient OperatorClient)> PendingReservationAsync()
    {
        var prosumer = await api.SeedProsumerAsync();
        var prosumerClient = await api.ClientForAsync(prosumer);
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, BusinessClock.Now.AddHours(30));

        var created = await (await prosumerClient.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot)))
            .ShouldSucceedAsync(HttpStatusCode.Created);

        var reservation = new EnergyReservation { Id = created.Id, SlotId = created.SlotId, Nic = prosumer.Nic };
        return (reservation, await api.ClientForAsync(await api.SeedOperatorAsync()));
    }

    private async Task<HttpClient> LoginAdminAsync() =>
        await api.ClientForAsync(new ApiFixture.Account(string.Empty, string.Empty, "admin@test.local"));
}
