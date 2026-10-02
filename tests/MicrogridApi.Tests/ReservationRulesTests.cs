using System.Net;
using System.Net.Http.Json;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;
using MicrogridApi.Tests.Infrastructure;
using Xunit;

namespace MicrogridApi.Tests;

// Business rules enforced by ReservationService (README section 11), exercised over HTTP.
// Notice rules are tested well clear of the 12-hour line (30h vs 6h) so they cannot flake
// when a run crosses a minute boundary.
[Collection(ApiCollection.Name)]
public class ReservationRulesTests(ApiFixture api)
{
    private static DateTime Now => DateTime.UtcNow;

    // ---- BR-01: 7-day booking window ----

    [MongoFact]
    public async Task Create_on_the_last_allowed_day_succeeds()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.Date.AddDays(7).AddHours(10));

        var response = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot));

        var created = await response.ShouldSucceedAsync(HttpStatusCode.Created);
        Assert.Equal("Pending", created.Status);
        Assert.False(created.QrEligible);
        Assert.Equal(station.StationName, created.StationName);
    }

    [MongoFact]
    public async Task Create_eight_days_ahead_is_rejected()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.Date.AddDays(8).AddHours(10));

        var response = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot));

        var error = await response.ShouldFailAsync(HttpStatusCode.BadRequest, "RESERVATION_WINDOW_EXCEEDED");
        Assert.NotNull(error.Details);
    }

    [MongoFact]
    public async Task Create_for_a_past_date_is_rejected()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.Date.AddDays(-1).AddHours(10));

        var response = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot));

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "RESERVATION_DATE_IN_PAST");
    }

    // ---- BR-10 / BR-15: who may book ----

    [MongoFact]
    public async Task Pending_prosumer_cannot_book()
    {
        var prosumer = await api.SeedProsumerAsync(UserStatus.Pending);
        var client = await api.ClientForAsync(prosumer);
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));

        var response = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot));

        await response.ShouldFailAsync(HttpStatusCode.Forbidden, "PROSUMER_NOT_ACTIVE");
    }

    [MongoFact]
    public async Task Prosumer_cannot_book_for_another_nic()
    {
        var (_, client, station) = await ArrangeProsumerAsync();
        var other = await api.SeedProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));

        var response = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(other.Nic, slot));

        await response.ShouldFailAsync(HttpStatusCode.Forbidden, "NOT_RESERVATION_OWNER");
    }

    [MongoFact]
    public async Task Grid_operator_can_book_on_a_prosumers_behalf()
    {
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));
        var prosumer = await api.SeedProsumerAsync();
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());

        var response = await operatorClient.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot));

        var created = await response.ShouldSucceedAsync(HttpStatusCode.Created);
        Assert.Equal(prosumer.Nic, created.Nic);
        Assert.Equal("Pending", created.Status);
    }

    [MongoFact]
    public async Task Assisted_booking_still_requires_an_active_prosumer()
    {
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));
        var pending = await api.SeedProsumerAsync(UserStatus.Pending);
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());

        var response = await operatorClient.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(pending.Nic, slot));

        await response.ShouldFailAsync(HttpStatusCode.Forbidden, "PROSUMER_NOT_ACTIVE");
    }

    [MongoFact]
    public async Task Backoffice_cannot_create_a_reservation()
    {
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));
        var prosumer = await api.SeedProsumerAsync();
        var admin = await api.ClientForAsync(new ApiFixture.Account(string.Empty, string.Empty, "admin@test.local"));

        var response = await admin.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [MongoFact]
    public async Task Prosumer_cannot_read_another_prosumers_reservation()
    {
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));
        var owner = await api.SeedProsumerAsync();
        var reservation = await api.SeedReservationAsync(owner.Nic, slot, ReservationStatus.Pending);
        var intruder = await api.ClientForAsync(await api.SeedProsumerAsync());

        var response = await intruder.GetAsync($"/api/reservations/{reservation.Id}");

        await response.ShouldFailAsync(HttpStatusCode.Forbidden, "NOT_RESERVATION_OWNER");
    }

    // ---- BR-11 .. BR-14, BR-18: slot checks at create time ----

    [MongoFact]
    public async Task Create_with_times_that_do_not_match_the_slot_is_rejected()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.Date.AddDays(2).AddHours(10));
        var request = HttpExtensions.BookingFor(prosumer.Nic, slot) with { StartTime = "03:00", EndTime = "04:00" };

        var response = await client.PostAsJsonAsync("/api/reservations", request);

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "SLOT_SCHEDULE_MISMATCH");
    }

    [MongoFact]
    public async Task Create_above_the_slot_capacity_is_rejected()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2), capacityKwh: 30);

        var response = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot, energyKwh: 30.5));

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "ENERGY_EXCEEDS_SLOT_CAPACITY");
    }

    [MongoFact]
    public async Task Create_with_zero_energy_fails_validation()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));

        var response = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot, energyKwh: 0));

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
    }

    [MongoFact]
    public async Task Booking_the_same_slot_twice_is_rejected()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));
        var request = HttpExtensions.BookingFor(prosumer.Nic, slot);

        (await client.PostAsJsonAsync("/api/reservations", request)).EnsureSuccessStatusCode();
        var second = await client.PostAsJsonAsync("/api/reservations", request);

        await second.ShouldFailAsync(HttpStatusCode.Conflict, "SLOT_ALREADY_RESERVED");
    }

    [MongoFact]
    public async Task A_slot_with_every_bay_reserved_is_full()
    {
        var station = await api.SeedStationAsync(batteryBays: 1);
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));
        var first = await api.SeedProsumerAsync();
        var second = await api.SeedProsumerAsync();

        var firstClient = await api.ClientForAsync(first);
        var secondClient = await api.ClientForAsync(second);

        (await firstClient.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(first.Nic, slot))).EnsureSuccessStatusCode();
        var response = await secondClient.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(second.Nic, slot));

        await response.ShouldFailAsync(HttpStatusCode.Conflict, "SLOT_FULL");
    }

    [MongoFact]
    public async Task An_offline_slot_cannot_be_booked()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2), available: false);

        var response = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot));

        await response.ShouldFailAsync(HttpStatusCode.Conflict, "SLOT_UNAVAILABLE");
    }

    [MongoFact]
    public async Task An_inactive_station_cannot_be_booked()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);
        var station = await api.SeedStationAsync(status: StationStatus.Inactive);
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));

        var response = await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot));

        await response.ShouldFailAsync(HttpStatusCode.Conflict, "STATION_INACTIVE");
    }

    [MongoFact]
    public async Task Creating_a_reservation_takes_one_bay_from_the_slot()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddDays(2));

        (await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot))).EnsureSuccessStatusCode();

        Assert.Equal(1, await api.ReservedCountAsync(slot.Id));
    }

    // ---- BR-02: 12 hours' notice to update ----

    [MongoFact]
    public async Task Update_with_enough_notice_changes_the_energy()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddHours(30));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Pending, 10);

        var response = await client.PutAsJsonAsync($"/api/reservations/{reservation.Id}", new UpdateReservationRequest(20));

        var updated = await response.ShouldSucceedAsync();
        Assert.Equal(20, updated.EnergyKwh);
    }

    [MongoFact]
    public async Task Update_inside_the_notice_period_is_rejected()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddHours(6));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Pending);

        var response = await client.PutAsJsonAsync($"/api/reservations/{reservation.Id}", new UpdateReservationRequest(12));

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "RESERVATION_NOTICE_TOO_SHORT");
    }

    [MongoFact]
    public async Task Editing_an_approved_reservation_sends_it_back_for_approval()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddHours(30));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Approved, 10);
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        (await operatorClient.PostAsync($"/api/qr/issue/{reservation.Id}", null)).EnsureSuccessStatusCode();

        var response = await client.PutAsJsonAsync($"/api/reservations/{reservation.Id}", new UpdateReservationRequest(15));

        var updated = await response.ShouldSucceedAsync();
        Assert.Equal("Pending", updated.Status);
        Assert.Equal(15, updated.EnergyKwh);
        Assert.False(updated.QrEligible);
        Assert.Null(updated.ApprovedBy);
        // The old QR code died with the approval.
        await (await client.GetAsync($"/api/qr/{reservation.Id}")).ShouldFailAsync(HttpStatusCode.NotFound, "QR_NOT_ISSUED");
    }

    [MongoFact]
    public async Task A_completed_reservation_cannot_be_updated()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddHours(30));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Completed);

        var response = await client.PutAsJsonAsync($"/api/reservations/{reservation.Id}", new UpdateReservationRequest(12));

        await response.ShouldFailAsync(HttpStatusCode.Conflict, "RESERVATION_NOT_MODIFIABLE");
    }

    // ---- BR-03: 12 hours' notice to cancel ----

    [MongoFact]
    public async Task Cancel_with_enough_notice_releases_the_slot()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddHours(30));
        var created = await (await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, slot)))
            .ShouldSucceedAsync(HttpStatusCode.Created);
        Assert.Equal(1, await api.ReservedCountAsync(slot.Id));

        var response = await client.PatchAsync($"/api/reservations/{created.Id}/cancel");

        Assert.Equal("Cancelled", (await response.ShouldSucceedAsync()).Status);
        Assert.Equal(0, await api.ReservedCountAsync(slot.Id));
    }

    [MongoFact]
    public async Task Cancel_inside_the_notice_period_is_rejected()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddHours(6));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Pending);

        var response = await client.PatchAsync($"/api/reservations/{reservation.Id}/cancel");

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "RESERVATION_NOTICE_TOO_SHORT");
    }

    [MongoFact]
    public async Task A_cancelled_reservation_cannot_be_cancelled_again()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddHours(30));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Cancelled);

        var response = await client.PatchAsync($"/api/reservations/{reservation.Id}/cancel");

        await response.ShouldFailAsync(HttpStatusCode.Conflict, "RESERVATION_NOT_CANCELLABLE");
    }

    // ---- reschedule (BR-01 + BR-02 on the new slot) ----

    [MongoFact]
    public async Task Reschedule_moves_the_booking_and_both_slot_counts()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var original = await api.SeedSlotAsync(station.Id, Now.AddHours(30));
        var target = await api.SeedSlotAsync(station.Id, Now.AddHours(40));
        var created = await (await client.PostAsJsonAsync("/api/reservations", HttpExtensions.BookingFor(prosumer.Nic, original)))
            .ShouldSucceedAsync(HttpStatusCode.Created);

        var response = await client.PatchAsJsonAsync($"/api/reservations/{created.Id}/reschedule", new RescheduleReservationRequest(target.Id));

        var moved = await response.ShouldSucceedAsync();
        Assert.Equal(target.Id, moved.SlotId);
        Assert.Equal(0, await api.ReservedCountAsync(original.Id));
        Assert.Equal(1, await api.ReservedCountAsync(target.Id));
    }

    [MongoFact]
    public async Task Reschedule_to_the_same_slot_is_rejected()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddHours(30));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Pending);

        var response = await client.PatchAsJsonAsync($"/api/reservations/{reservation.Id}/reschedule", new RescheduleReservationRequest(slot.Id));

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "RESERVATION_SAME_SLOT");
    }

    [MongoFact]
    public async Task Reschedule_to_a_slot_beyond_seven_days_is_rejected()
    {
        var (prosumer, client, station) = await ArrangeProsumerAsync();
        var slot = await api.SeedSlotAsync(station.Id, Now.AddHours(30));
        var far = await api.SeedSlotAsync(station.Id, Now.Date.AddDays(9).AddHours(10));
        var reservation = await api.SeedReservationAsync(prosumer.Nic, slot, ReservationStatus.Pending);

        var response = await client.PatchAsJsonAsync($"/api/reservations/{reservation.Id}/reschedule", new RescheduleReservationRequest(far.Id));

        await response.ShouldFailAsync(HttpStatusCode.BadRequest, "RESERVATION_WINDOW_EXCEEDED");
    }

    // ---- validate (pre-flight) ----

    [MongoFact]
    public async Task Validate_reports_why_a_slot_cannot_be_booked()
    {
        var (_, client, station) = await ArrangeProsumerAsync();
        var offline = await api.SeedSlotAsync(station.Id, Now.AddDays(2), available: false);
        var open = await api.SeedSlotAsync(station.Id, Now.AddDays(2));

        var blocked = await (await client.GetAsync($"/api/reservations/validate?slotId={offline.Id}"))
            .ReadAsync<ReservationValidationResponse>();
        var allowed = await (await client.GetAsync($"/api/reservations/validate?slotId={open.Id}"))
            .ReadAsync<ReservationValidationResponse>();

        Assert.False(blocked.Valid);
        Assert.Equal("SLOT_UNAVAILABLE", blocked.Code);
        Assert.True(allowed.Valid);
    }

    // ---- helpers ----

    private async Task<(ApiFixture.Account Prosumer, HttpClient Client, SolarStationInfo Station)> ArrangeProsumerAsync()
    {
        var prosumer = await api.SeedProsumerAsync();
        var client = await api.ClientForAsync(prosumer);
        var station = await api.SeedStationAsync();
        return (prosumer, client, station);
    }
}
