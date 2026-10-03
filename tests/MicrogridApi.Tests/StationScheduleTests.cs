using MicrogridApi.Common;
using System.Net;
using System.Net.Http.Json;
using MicrogridApi.DTOs.Slots;
using MicrogridApi.DTOs.Stations;
using MicrogridApi.Tests.Infrastructure;
using Xunit;

namespace MicrogridApi.Tests;

// Weekly hours per day, and the "someone else changed this" check on stations and slots.
[Collection(ApiCollection.Name)]
public class StationScheduleTests(ApiFixture api)
{
    private static readonly string[] AllDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    // The next date (from tomorrow) that falls on the given weekday.
    private static DateTime Next(DayOfWeek day)
    {
        var date = BusinessClock.Today.AddDays(1);
        while (date.DayOfWeek != day)
        {
            date = date.AddDays(1);
        }

        return date;
    }

    private async Task<HttpClient> AdminAsync() => await api.ClientForAsync(ApiFixture.Admin);

    private static object Schedule(object[]? dayHours = null, string[]? days = null, string open = "06:00", string close = "10:00") => new
    {
        openTime = open,
        closeTime = close,
        activeDays = days ?? AllDays,
        dayHours
    };

    private async Task<StationResponse> CreateStationAsync(object schedule)
    {
        var admin = await AdminAsync();
        var response = await admin.PostAsJsonAsync("/api/stations", new
        {
            stationName = $"Hours Test {Guid.NewGuid():N}"[..24],
            location = "Test Road",
            latitude = 6.9,
            longitude = 79.8,
            capacityKwh = 120,
            batterySlotCount = 4,
            type = "AC",
            operationalSchedule = schedule
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<StationResponse>();
    }

    private async Task<List<SlotResponse>> GenerateAsync(StationResponse station, DateTime day)
    {
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var response = await operatorClient.PostAsJsonAsync($"/api/stations/{station.Id}/slots/generate", new { date = day });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<List<SlotResponse>>();
    }

    [MongoFact]
    public async Task A_day_with_its_own_hours_generates_slots_for_those_hours_only()
    {
        var station = await CreateStationAsync(Schedule(dayHours: [new { day = "Saturday", openTime = "08:00", closeTime = "10:00" }]));

        var saturday = await GenerateAsync(station, Next(DayOfWeek.Saturday));
        var monday = await GenerateAsync(station, Next(DayOfWeek.Monday));

        Assert.Equal(["08:00", "09:00"], saturday.Select(s => s.StartTime));
        Assert.Equal(["06:00", "07:00", "08:00", "09:00"], monday.Select(s => s.StartTime));
    }

    [MongoFact]
    public async Task The_station_reports_its_per_day_hours()
    {
        var station = await CreateStationAsync(Schedule(dayHours: [new { day = "sunday", openTime = "09:00", closeTime = "12:00" }]));

        var fetched = await (await (await AdminAsync()).GetAsync($"/api/stations/{station.Id}")).ReadAsync<StationResponse>();

        var entry = Assert.Single(fetched.OperationalSchedule.DayHours);
        Assert.Equal(new DayHoursResponse("Sunday", "09:00", "12:00"), entry); // day name normalised
    }

    [MongoFact]
    public async Task A_station_without_per_day_hours_still_works_as_before()
    {
        var station = await CreateStationAsync(Schedule());

        Assert.Empty(station.OperationalSchedule.DayHours);
        Assert.Equal(4, (await GenerateAsync(station, Next(DayOfWeek.Tuesday))).Count);
    }

    [MongoFact]
    public async Task Per_day_hours_are_validated()
    {
        var admin = await AdminAsync();
        var body = (object dayHours) => new
        {
            stationName = $"Bad Hours {Guid.NewGuid():N}"[..20], location = "Road", latitude = 6.9, longitude = 79.8,
            capacityKwh = 120, batterySlotCount = 4, type = "AC",
            operationalSchedule = Schedule(dayHours: (object[])dayHours, days: ["Monday", "Tuesday"])
        };

        var notActive = await admin.PostAsJsonAsync("/api/stations", body(new object[] { new { day = "Saturday", openTime = "08:00", closeTime = "10:00" } }));
        var backwards = await admin.PostAsJsonAsync("/api/stations", body(new object[] { new { day = "Monday", openTime = "10:00", closeTime = "08:00" } }));
        var duplicate = await admin.PostAsJsonAsync("/api/stations", body(new object[]
        {
            new { day = "Monday", openTime = "08:00", closeTime = "09:00" },
            new { day = "Monday", openTime = "10:00", closeTime = "11:00" }
        }));
        var badTime = await admin.PostAsJsonAsync("/api/stations", body(new object[] { new { day = "Monday", openTime = "8am", closeTime = "10:00" } }));

        foreach (var response in new[] { notActive, backwards, duplicate, badTime })
        {
            await response.ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
        }
    }

    [MongoFact]
    public async Task Shrinking_a_days_hours_is_refused_while_slots_would_fall_outside_them()
    {
        var station = await CreateStationAsync(Schedule());
        await GenerateAsync(station, Next(DayOfWeek.Saturday)); // slots 06:00-10:00
        var admin = await AdminAsync();

        var shrink = await admin.PatchAsJsonAsync($"/api/stations/{station.Id}/schedule",
            Schedule(dayHours: [new { day = "Saturday", openTime = "08:00", closeTime = "10:00" }]));
        var other = await admin.PatchAsJsonAsync($"/api/stations/{station.Id}/schedule",
            Schedule(dayHours: [new { day = "Friday", openTime = "08:00", closeTime = "10:00" }]));

        await shrink.ShouldFailAsync(HttpStatusCode.Conflict, "STATION_SCHEDULE_CONFLICT");
        Assert.Equal(HttpStatusCode.OK, other.StatusCode); // a different day's hours don't touch Saturday's slots
    }

    // ---- edit conflicts ----

    [MongoFact]
    public async Task Editing_a_station_with_an_old_version_is_refused()
    {
        var station = await CreateStationAsync(Schedule());
        var admin = await AdminAsync();
        var edit = (string name, DateTime? version) => new
        {
            stationName = name, location = "Road", latitude = 6.9, longitude = 79.8,
            capacityKwh = 120, batterySlotCount = 4, type = "AC", expectedUpdatedAt = version
        };

        var first = await admin.PutAsJsonAsync($"/api/stations/{station.Id}", edit("Renamed once", station.UpdatedAt));
        var staleAttempt = await admin.PutAsJsonAsync($"/api/stations/{station.Id}", edit("Renamed twice", station.UpdatedAt));
        var noVersion = await admin.PutAsJsonAsync($"/api/stations/{station.Id}", edit("Renamed without version", null));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        await staleAttempt.ShouldFailAsync(HttpStatusCode.Conflict, "STATION_CHANGED");
        Assert.Equal(HttpStatusCode.OK, noVersion.StatusCode);
    }

    [MongoFact]
    public async Task Changing_the_schedule_with_an_old_version_is_refused()
    {
        var station = await CreateStationAsync(Schedule());
        var admin = await AdminAsync();
        (await admin.PatchAsJsonAsync($"/api/stations/{station.Id}/schedule", Schedule(close: "11:00"))).EnsureSuccessStatusCode();

        var stale = await admin.PatchAsJsonAsync($"/api/stations/{station.Id}/schedule",
            new { openTime = "06:00", closeTime = "12:00", activeDays = AllDays, expectedUpdatedAt = station.UpdatedAt });

        await stale.ShouldFailAsync(HttpStatusCode.Conflict, "STATION_CHANGED");
    }

    [MongoFact]
    public async Task Editing_a_slot_with_an_old_version_is_refused()
    {
        var station = await api.SeedStationAsync();
        var slot = await api.SeedSlotAsync(station.Id, BusinessClock.Now.AddDays(2).Date.AddHours(9));
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var edit = (double kwh, DateTime? version) => new
        {
            slotDate = slot.SlotDate, startTime = slot.StartTime, endTime = slot.EndTime, capacityKwh = kwh, expectedUpdatedAt = version
        };

        var first = await operatorClient.PutAsJsonAsync($"/api/slots/{slot.Id}", edit(40, slot.UpdatedAt));
        var stale = await operatorClient.PutAsJsonAsync($"/api/slots/{slot.Id}", edit(50, slot.UpdatedAt));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        await stale.ShouldFailAsync(HttpStatusCode.Conflict, "SLOT_CHANGED");
    }
}
