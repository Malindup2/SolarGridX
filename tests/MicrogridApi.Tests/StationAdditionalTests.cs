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
    
}