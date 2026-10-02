using System.Net;
using System.Text;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Activity;
using MicrogridApi.Models;
using MicrogridApi.Tests.Infrastructure;
using Xunit;

namespace MicrogridApi.Tests;

// GET /search (command palette) and GET /exports/{kind}.csv.
[Collection(ApiCollection.Name)]
public class SearchExportTests(ApiFixture api)
{
    [MongoFact]
    public async Task Search_finds_stations_by_name_for_every_role()
    {
        var station = await api.SeedStationAsync();
        var prosumerClient = await api.ClientForAsync(await api.SeedProsumerAsync());

        var hits = await Search(prosumerClient, station.StationName);

        Assert.Contains(hits, h => h.Kind == "station" && h.Id == station.Id);
    }

    [MongoFact]
    public async Task Only_the_backoffice_can_find_staff_users()
    {
        var target = await api.SeedOperatorAsync();
        var admin = await api.ClientForAsync(ApiFixture.Admin);
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());

        Assert.Contains(await Search(admin, target.Email), h => h.Kind == "user" && h.Id == target.Id);
        Assert.DoesNotContain(await Search(operatorClient, target.Email), h => h.Kind == "user");
    }

    [MongoFact]
    public async Task A_prosumer_only_finds_their_own_reservations()
    {
        var station = await api.SeedStationAsync();
        var mine = await api.SeedProsumerAsync();
        var theirs = await api.SeedProsumerAsync();
        await api.SeedReservationAsync(mine.Nic, await api.SeedSlotAsync(station.Id, DateTime.UtcNow.AddDays(1)), ReservationStatus.Pending);
        await api.SeedReservationAsync(theirs.Nic, await api.SeedSlotAsync(station.Id, DateTime.UtcNow.AddDays(1)), ReservationStatus.Pending);
        var client = await api.ClientForAsync(mine);

        Assert.DoesNotContain(await Search(client, theirs.Nic), h => h.Kind == "reservation");
        Assert.Contains(await Search(client, mine.Nic), h => h.Kind == "reservation");
    }

    [MongoFact]
    public async Task Search_treats_the_query_as_plain_text()
    {
        var client = await api.ClientForAsync(await api.SeedOperatorAsync());

        var response = await client.GetAsync("/api/search?q=" + Uri.EscapeDataString("(.*["));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [MongoFact]
    public async Task Search_needs_two_to_eighty_characters()
    {
        var client = await api.ClientForAsync(await api.SeedOperatorAsync());

        await (await client.GetAsync("/api/search?q=a")).ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
        await (await client.GetAsync("/api/search?q=" + new string('a', 81))).ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
    }

    [MongoFact]
    public async Task Reservations_export_as_excel_friendly_csv()
    {
        var station = await api.SeedStationAsync();
        var prosumer = await api.SeedProsumerAsync();
        var reservation = await api.SeedReservationAsync(prosumer.Nic, await api.SeedSlotAsync(station.Id, DateTime.UtcNow.AddDays(1)), ReservationStatus.Pending);
        var client = await api.ClientForAsync(await api.SeedOperatorAsync());

        var response = await client.GetAsync($"/api/exports/reservations.csv?nic={prosumer.Nic}");
        var bytes = await response.Content.ReadAsByteArrayAsync();
        var text = Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3);
        var lines = text.Split("\r\n", StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType!.MediaType);
        Assert.Contains(".csv", response.Content.Headers.ContentDisposition!.FileName);
        Assert.Equal(Encoding.UTF8.GetPreamble(), bytes[..3]);
        Assert.StartsWith("\"Id\",\"NIC\",\"Station\"", lines[0]);
        Assert.Equal(2, lines.Length);
        Assert.Contains($"\"{reservation.Id}\"", lines[1]);
        Assert.Contains(station.StationName, lines[1]);
    }

    [MongoFact]
    public async Task Export_permissions_follow_the_role()
    {
        var operatorClient = await api.ClientForAsync(await api.SeedOperatorAsync());
        var prosumerClient = await api.ClientForAsync(await api.SeedProsumerAsync());
        var admin = await api.ClientForAsync(ApiFixture.Admin);

        await (await operatorClient.GetAsync("/api/exports/users.csv")).ShouldFailAsync(HttpStatusCode.Forbidden, "EXPORT_FORBIDDEN");
        Assert.Equal(HttpStatusCode.Forbidden, (await prosumerClient.GetAsync("/api/exports/reservations.csv")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/exports/users.csv")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await operatorClient.GetAsync("/api/exports/stations.csv")).StatusCode);
        await (await admin.GetAsync("/api/exports/invoices.csv")).ShouldFailAsync(HttpStatusCode.BadRequest, "UNKNOWN_EXPORT");
        await (await admin.GetAsync("/api/exports/prosumers.csv?status=Banana")).ShouldFailAsync(HttpStatusCode.BadRequest, "VALIDATION_FAILED");
    }

    [Theory]
    [InlineData("plain", "\"plain\"")]
    [InlineData("say \"hi\"", "\"say \"\"hi\"\"\"")]
    [InlineData("a,b", "\"a,b\"")]
    [InlineData("=HYPERLINK(\"x\")", "\"'=HYPERLINK(\"\"x\"\")\"")]
    [InlineData("+1", "\"'+1\"")]
    [InlineData("-2", "\"'-2\"")]
    [InlineData("@cmd", "\"'@cmd\"")]
    [InlineData("  =1", "\"'  =1\"")]
    [InlineData(null, "\"\"")]
    public void Csv_cells_are_quoted_and_formulas_neutralised(string? value, string expected)
    {
        Assert.Equal(expected, CsvWriter.Escape(value));
    }

    private static async Task<List<SearchHitResponse>> Search(HttpClient client, string q) =>
        await (await client.GetAsync("/api/search?q=" + Uri.EscapeDataString(q))).ReadAsync<List<SearchHitResponse>>();
}
