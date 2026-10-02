using System.Net;
using System.Net.Http.Json;
using MicrogridApi.DTOs.Activity;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;
using MicrogridApi.Tests.Infrastructure;
using Xunit;

namespace MicrogridApi.Tests;

// Notifications (inbox) and the audit trail.
[Collection(ApiCollection.Name)]
public class ActivityTests(ApiFixture api)
{
    [MongoFact]
    public async Task Approving_a_booking_notifies_the_prosumer()
    {
        var (prosumerClient, operatorClient, reservation) = await BookAsync();

        (await operatorClient.PatchAsync($"/api/reservations/{reservation.Id}/approve")).EnsureSuccessStatusCode();
        var inbox = await Inbox(prosumerClient);

        var item = Assert.Single(inbox.Items, n => n.ResourceId == reservation.Id && n.Message.Contains("approved"));
        Assert.Equal("Reservation", item.Category);
        Assert.Equal("Reservation", item.Action);
        Assert.Equal("Medium", item.Priority);
        Assert.Null(item.ReadAt);
        Assert.True(inbox.UnreadCount >= 1);
    }

    [MongoFact]
    public async Task A_new_booking_notifies_operators_but_not_the_prosumer_who_made_it()
    {
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var (prosumerClient, _, reservation) = await BookAsync();

        Assert.Contains((await Inbox(operatorClient)).Items, n => n.ResourceId == reservation.Id);
        Assert.DoesNotContain((await Inbox(prosumerClient)).Items, n => n.ResourceId == reservation.Id);
    }

    [MongoFact]
    public async Task Rejection_is_high_priority_and_carries_the_reason()
    {
        var (prosumerClient, operatorClient, reservation) = await BookAsync();

        (await operatorClient.PatchAsJsonAsync($"/api/reservations/{reservation.Id}/reject",
            new RejectReservationRequest("Grid maintenance"))).EnsureSuccessStatusCode();

        var item = Assert.Single((await Inbox(prosumerClient)).Items, n => n.ResourceId == reservation.Id);
        Assert.Equal("High", item.Priority);
        Assert.Contains("Grid maintenance", item.Message);
    }

    [MongoFact]
    public async Task Notifications_can_be_marked_read_one_by_one_or_all_at_once()
    {
        var (prosumerClient, operatorClient, reservation) = await BookAsync();
        (await operatorClient.PatchAsync($"/api/reservations/{reservation.Id}/approve")).EnsureSuccessStatusCode();
        var item = (await Inbox(prosumerClient)).Items.First();

        Assert.Equal(HttpStatusCode.NoContent, (await prosumerClient.PostAsync($"/api/notifications/{item.Id}/read", null)).StatusCode);
        Assert.NotNull((await Inbox(prosumerClient)).Items.Single(n => n.Id == item.Id).ReadAt);

        Assert.Equal(HttpStatusCode.NoContent, (await prosumerClient.PostAsync("/api/notifications/read-all", null)).StatusCode);
        var after = await Inbox(prosumerClient);
        Assert.Equal(0, after.UnreadCount);
        Assert.Empty((await (await prosumerClient.GetAsync("/api/notifications?unreadOnly=true")).ReadAsync<NotificationInboxResponse>()).Items);
    }

    [MongoFact]
    public async Task Nobody_can_mark_someone_elses_notification()
    {
        var (prosumerClient, operatorClient, reservation) = await BookAsync();
        (await operatorClient.PatchAsync($"/api/reservations/{reservation.Id}/approve")).EnsureSuccessStatusCode();
        var item = (await Inbox(prosumerClient)).Items.First();
        var stranger = await api.ClientForAsync(await api.SeedProsumerAsync());

        var response = await stranger.PostAsync($"/api/notifications/{item.Id}/read", null);

        await response.ShouldFailAsync(HttpStatusCode.NotFound, "NOTIFICATION_NOT_FOUND");
    }

    [MongoFact]
    public async Task An_unknown_priority_filter_is_rejected()
    {
        var client = await api.ClientForAsync(await api.SeedOperatorAsync());

        var response = await client.GetAsync("/api/notifications?priority=Urgent");

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
    }

    [MongoFact]
    public async Task The_audit_trail_records_each_step_and_who_took_it()
    {
        var (prosumerClient, operatorClient, reservation) = await BookAsync();
        (await operatorClient.PatchAsync($"/api/reservations/{reservation.Id}/approve")).EnsureSuccessStatusCode();

        var trail = await (await operatorClient.GetAsync($"/api/audit/reservations/{reservation.Id}")).ReadAsync<List<AuditEntryResponse>>();

        Assert.Equal(["ReservationApproved", "ReservationCreated"], trail.Select(e => e.Event));
        Assert.Equal("GridOperator", trail[0].ActorRole);
        Assert.Equal("Prosumer", trail[1].ActorRole);
        Assert.All(trail, e => Assert.Matches("^[0-9a-f]{32}$", e.CorrelationId!));

        // The owner may read their own reservation's history too.
        Assert.Equal(HttpStatusCode.OK, (await prosumerClient.GetAsync($"/api/audit/reservations/{reservation.Id}")).StatusCode);
    }

    [MongoFact]
    public async Task Audit_access_follows_the_role_rules()
    {
        var (_, _, reservation) = await BookAsync();
        var station = await api.SeedStationAsync();
        var stranger = await api.ClientForAsync(await api.SeedProsumerAsync());
        var operatorAccount = await api.SeedOperatorAsync();
        var operatorClient = await api.ClientForAsync(operatorAccount);

        await (await stranger.GetAsync($"/api/audit/reservations/{reservation.Id}")).ShouldFailAsync(HttpStatusCode.Forbidden, "AUDIT_FORBIDDEN");
        await (await stranger.GetAsync($"/api/audit/stations/{station.Id}")).ShouldFailAsync(HttpStatusCode.Forbidden, "AUDIT_FORBIDDEN");
        await (await operatorClient.GetAsync($"/api/audit/users/{reservation.Nic}")).ShouldFailAsync(HttpStatusCode.Forbidden, "AUDIT_FORBIDDEN");
        await (await operatorClient.GetAsync("/api/audit/invoices/1")).ShouldFailAsync(HttpStatusCode.BadRequest, "UNKNOWN_AUDIT_KIND");
        Assert.Equal(HttpStatusCode.OK, (await operatorClient.GetAsync("/api/audit/users/me")).StatusCode);
    }

    [MongoFact]
    public async Task Backoffice_reads_a_prosumers_history_by_nic()
    {
        var prosumer = await api.SeedProsumerAsync(UserStatus.Pending);
        var admin = await api.ClientForAsync(ApiFixture.Admin);
        (await admin.PatchAsync($"/api/prosumers/{prosumer.Nic}/activate")).EnsureSuccessStatusCode();

        var trail = await (await admin.GetAsync($"/api/audit/users/{prosumer.Nic}")).ReadAsync<List<AuditEntryResponse>>();

        Assert.Contains(trail, e => e.Event == "AccountActivated" && e.ActorRole == "Backoffice");
    }

    [MongoFact]
    public async Task Activation_lands_in_the_prosumers_inbox()
    {
        var prosumer = await api.SeedProsumerAsync(UserStatus.Pending);
        var client = await api.ClientForAsync(prosumer); // pending prosumers can sign in
        var admin = await api.ClientForAsync(ApiFixture.Admin);

        (await admin.PatchAsync($"/api/prosumers/{prosumer.Nic}/activate")).EnsureSuccessStatusCode();

        Assert.Contains((await Inbox(client)).Items, n => n.Message.Contains("active", StringComparison.OrdinalIgnoreCase));
    }

    private static async Task<NotificationInboxResponse> Inbox(HttpClient client) =>
        await (await client.GetAsync("/api/notifications")).ReadAsync<NotificationInboxResponse>();

    private async Task<(HttpClient Prosumer, HttpClient Operator, ReservationResponse Reservation)> BookAsync()
    {
        var prosumer = await api.SeedProsumerAsync();
        var prosumerClient = await api.ClientForAsync(prosumer);
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, DateTime.UtcNow.AddHours(30));

        var reservation = await (await prosumerClient.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot)))
            .ShouldSucceedAsync(HttpStatusCode.Created);
        return (prosumerClient, operatorClient, reservation);
    }
}
