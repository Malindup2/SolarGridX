using System.Net;
using System.Net.Http.Json;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Stations;
using MicrogridApi.Models;
using MicrogridApi.Tests.Infrastructure;
using MicrogridApi.Validators;
using MongoDB.Driver;
using Xunit;

namespace MicrogridApi.Tests;

[Collection(ApiCollection.Name)]
public class StationAdditionalTests(ApiFixture api)
{
    private Task<HttpClient> AdminAsync() =>
        api.ClientForAsync(ApiFixture.Admin);

    private static CreateStationRequest ValidRequest() => new(
        $"Station {Guid.NewGuid():N}",
        "Test Road",
        6.9271,
        79.8612,
        120,
        4,
        "AC",
        new StationScheduleRequest(
            "06:00",
            "22:00",
            ["Monday", "Tuesday", "Wednesday", "Thursday",
             "Friday", "Saturday", "Sunday"]));

    private static UpdateStationRequest Edit(
        SolarStationInfo station,
        double capacity,
        int bays) => new(
            station.StationName,
            station.Location,
            station.Latitude,
            station.Longitude,
            capacity,
            bays,
            station.Type.ToString());

    private static async Task<StationResponse> FetchAsync(
        HttpClient client, string id)
    {
        var response = await client.GetAsync($"/api/stations/{id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<StationResponse>();
    }

        [MongoFact]
    public async Task Registers_station_and_persists_normalized_details()
    {
        var admin = await AdminAsync();
        var request = ValidRequest() with
        {
            StationName = $"  New Station {Guid.NewGuid():N}  ",
            Location = "  Colombo Test Road  "
        };

        var response = await admin.PostAsJsonAsync(
            "/api/stations", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.ReadAsync<StationResponse>();
        var saved = await FetchAsync(admin, created.Id);

        Assert.Equal(request.StationName!.Trim(), saved.StationName);
        Assert.Equal("Colombo Test Road", saved.Location);
        Assert.Equal("Active", saved.Status);
        Assert.Equal(120d, saved.CapacityKwh);
        Assert.Equal(4, saved.BatterySlotCount);
        Assert.Equal("AC", saved.Type);
        Assert.Equal(created.CreatedAt, saved.CreatedAt);
        Assert.NotEqual(default(DateTime), saved.CreatedAt);
        Assert.Equal(
            request.OperationalSchedule!.ActiveDays,
            saved.OperationalSchedule.ActiveDays);
    }


        [Fact]
    public void Rejects_invalid_station_fields()
    {
        var validator = new CreateStationRequestValidator();
        var valid = ValidRequest();

        Assert.True(validator.Validate(valid).IsValid);

        CreateStationRequest[] invalidRequests =
        [
            valid with { StationName = "" },
            valid with { StationName = new string('x', 121) },
            valid with { Location = "" },
            valid with { Location = new string('x', 251) },
            valid with { Latitude = null },
            valid with { Latitude = 91 },
            valid with { Longitude = -181 },
            valid with { CapacityKwh = 0 },
            valid with { CapacityKwh = -1 },
            valid with { BatterySlotCount = 0 },
            valid with { BatterySlotCount = -1 },
            valid with { Type = "Other" },
            valid with { OperationalSchedule = null }
        ];

        foreach (var request in invalidRequests)
        {
            Assert.False(validator.Validate(request).IsValid);
        }

        Assert.True(validator.Validate(
            valid with { Latitude = -90, Longitude = -180 }).IsValid);

        Assert.True(validator.Validate(
            valid with { Latitude = 90, Longitude = 180 }).IsValid);
    }

        [MongoFact]
    public async Task Enforces_station_management_permissions()
    {
        var station = await api.SeedStationAsync();
        var prosumer = await api.ClientForAsync(
            await api.SeedProsumerAsync());
        var operatorClient = await api.ClientForAsync(
            await api.SeedOperatorAsync());

        foreach (var client in new[] { prosumer, operatorClient })
        {
            Assert.Equal(HttpStatusCode.Forbidden,
                (await client.PostAsJsonAsync(
                    "/api/stations", ValidRequest())).StatusCode);

            Assert.Equal(HttpStatusCode.Forbidden,
                (await client.PutAsJsonAsync(
                    $"/api/stations/{station.Id}",
                    Edit(station, 120, 4))).StatusCode);

            foreach (var action in new[] { "activate", "deactivate" })
            {
                Assert.Equal(HttpStatusCode.Forbidden,
                    (await client.PatchAsJsonAsync(
                        $"/api/stations/{station.Id}/{action}",
                        new { })).StatusCode);
            }

            Assert.Equal(HttpStatusCode.Forbidden,
                (await client.DeleteAsync(
                    $"/api/stations/{station.Id}")).StatusCode);
        }

        var schedule = ValidRequest().OperationalSchedule!;

        Assert.Equal(HttpStatusCode.Forbidden,
            (await prosumer.PatchAsJsonAsync(
                $"/api/stations/{station.Id}/schedule",
                schedule)).StatusCode);

        Assert.Equal(HttpStatusCode.OK,
            (await operatorClient.PatchAsJsonAsync(
                $"/api/stations/{station.Id}/schedule",
                schedule)).StatusCode);

        using var anonymous = api.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.GetAsync("/api/stations")).StatusCode);

        var saved = await FetchAsync(await AdminAsync(), station.Id);
        Assert.Equal("Active", saved.Status);
        Assert.Equal(station.StationName, saved.StationName);
    }


        [MongoFact]
    public async Task Deletion_preserves_referenced_stations()
    {
        var admin = await AdminAsync();

        var emptyStation = await api.SeedStationAsync();

        Assert.Equal(HttpStatusCode.NoContent,
            (await admin.DeleteAsync(
                $"/api/stations/{emptyStation.Id}")).StatusCode);

        await (await admin.GetAsync(
            $"/api/stations/{emptyStation.Id}")).ShouldFailAsync(
                HttpStatusCode.NotFound, "STATION_NOT_FOUND");

        var withSlot = await api.SeedStationAsync();
        await api.SeedSlotAsync(
            withSlot.Id, BusinessClock.Today.AddDays(-2).AddHours(9));

        await (await admin.DeleteAsync(
            $"/api/stations/{withSlot.Id}")).ShouldFailAsync(
                HttpStatusCode.Conflict, "STATION_HAS_DEPENDENCIES");

        await FetchAsync(admin, withSlot.Id);

        var withReservation = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(
            withReservation.Id,
            BusinessClock.Today.AddDays(-2).AddHours(9));

        var prosumer = await api.SeedProsumerAsync();

        await api.SeedReservationAsync(
            prosumer.Nic, slot, ReservationStatus.Completed);

        // Test-only setup: isolate the reservation dependency from
        // the slot dependency in the disposable test database.
        await api.Collection<EnergyBookingSlot>("EnergyBookingSlots")
            .DeleteOneAsync(s => s.Id == slot.Id);

        await (await admin.DeleteAsync(
            $"/api/stations/{withReservation.Id}")).ShouldFailAsync(
                HttpStatusCode.Conflict, "STATION_HAS_DEPENDENCIES");

        await FetchAsync(admin, withReservation.Id);
    }



        [MongoFact]
    public async Task Capacity_changes_respect_upcoming_slots()
    {
        var admin = await AdminAsync();
        var station = await api.SeedStationAsync();

        await api.SeedSlotAsync(
            station.Id, BusinessClock.Today.AddDays(2).AddHours(9));

        foreach (var change in new[]
        {
            Edit(station, 100, 4),
            Edit(station, 120, 3),
            Edit(station, 120, 5)
        })
        {
            await (await admin.PutAsJsonAsync(
                $"/api/stations/{station.Id}", change)).ShouldFailAsync(
                    HttpStatusCode.Conflict,
                    "STATION_CAPACITY_CHANGE_BLOCKED");

            var unchanged = await FetchAsync(admin, station.Id);
            Assert.Equal(120d, unchanged.CapacityKwh);
            Assert.Equal(4, unchanged.BatterySlotCount);
        }

        Assert.Equal(HttpStatusCode.OK,
            (await admin.PutAsJsonAsync(
                $"/api/stations/{station.Id}",
                Edit(station, 150, 4))).StatusCode);

        Assert.Equal(150d,
            (await FetchAsync(admin, station.Id)).CapacityKwh);

        var withoutSlots = await api.SeedStationAsync();

        Assert.Equal(HttpStatusCode.OK,
            (await admin.PutAsJsonAsync(
                $"/api/stations/{withoutSlots.Id}",
                Edit(withoutSlots, 100, 3))).StatusCode);

        var updated = await FetchAsync(admin, withoutSlots.Id);
        Assert.Equal(100d, updated.CapacityKwh);
        Assert.Equal(3, updated.BatterySlotCount);
    }



        [MongoFact]
    public async Task Nearby_search_filters_and_orders_stations()
    {
        var admin = await AdminAsync();

        async Task<SolarStationInfo> SeedAtAsync(
            double latitude, StationStatus status = StationStatus.Active)
        {
            var station = await api.SeedStationAsync(status: status);

            await api.Collection<SolarStationInfo>("SolarStationInfo")
                .UpdateOneAsync(
                    s => s.Id == station.Id,
                    Builders<SolarStationInfo>.Update
                        .Set(s => s.Latitude, latitude)
                        .Set(s => s.Longitude, -100));

            return station;
        }

        var nearest = await SeedAtAsync(40);
        var further = await SeedAtAsync(40.1);
        var outside = await SeedAtAsync(41);
        var inactive = await SeedAtAsync(40, StationStatus.Inactive);

        var response = await admin.GetAsync(
            "/api/stations/nearby?lat=40&lng=-100&radiusKm=50");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stations = await response.ReadAsync<List<StationResponse>>();

        var ownResults = stations
            .Where(s => s.Id == nearest.Id || s.Id == further.Id)
            .Select(s => s.Id)
            .ToArray();

        Assert.Equal(new[] { nearest.Id, further.Id }, ownResults);
        Assert.DoesNotContain(stations, s => s.Id == outside.Id);
        Assert.DoesNotContain(stations, s => s.Id == inactive.Id);

        foreach (var query in new[]
        {
            "lat=40&lng=-100",
            "lat=91&lng=-100&radiusKm=10",
            "lat=40&lng=-181&radiusKm=10",
            "lat=40&lng=-100&radiusKm=0",
            "lat=40&lng=-100&radiusKm=50.1"
        })
        {
            await (await admin.GetAsync(
                $"/api/stations/nearby?{query}")).ShouldFailAsync(
                    HttpStatusCode.BadRequest, "VALIDATION_FAILED");
        }

        Assert.Equal(HttpStatusCode.OK,
            (await admin.GetAsync(
                "/api/stations/nearby?lat=40&lng=-100&radiusKm=0.5"))
            .StatusCode);
    }



        [MongoFact]
    public async Task Availability_flag_matches_bookable_slot_rules()
    {
        var admin = await AdminAsync();

        var cases = new[]
        {
            (Days: 2, Available: true, Full: false,
                Status: StationStatus.Active, Expected: true),
            (Days: 7, Available: true, Full: false,
                Status: StationStatus.Active, Expected: true),
            (Days: 8, Available: true, Full: false,
                Status: StationStatus.Active, Expected: false),
            (Days: -1, Available: true, Full: false,
                Status: StationStatus.Active, Expected: false),
            (Days: 2, Available: false, Full: false,
                Status: StationStatus.Active, Expected: false),
            (Days: 2, Available: true, Full: true,
                Status: StationStatus.Active, Expected: false),
            (Days: 2, Available: true, Full: false,
                Status: StationStatus.Inactive, Expected: false)
        };

        foreach (var item in cases)
        {
            var station = await api.SeedStationAsync(status: item.Status);

            var slot = await api.SeedSlotAsync(
                station.Id,
                BusinessClock.Today.AddDays(item.Days).AddHours(9),
                available: item.Available);

            if (item.Full)
            {
                await api.Collection<EnergyBookingSlot>("EnergyBookingSlots")
                    .UpdateOneAsync(
                        s => s.Id == slot.Id,
                        Builders<EnergyBookingSlot>.Update.Set(
                            s => s.ReservedCount, station.BatterySlotCount));
            }

            var saved = await FetchAsync(admin, station.Id);
            Assert.Equal((bool?)item.Expected, saved.HasUpcomingSlots);
        }

        var withoutSlots = await api.SeedStationAsync();

        Assert.Equal((bool?)false,
            (await FetchAsync(admin, withoutSlots.Id)).HasUpcomingSlots);
    }

}