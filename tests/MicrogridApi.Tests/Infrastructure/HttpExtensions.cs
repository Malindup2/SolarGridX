using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;
using Xunit;

namespace MicrogridApi.Tests.Infrastructure;

public static class HttpExtensions
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static Task<HttpResponseMessage> PatchAsync(this HttpClient client, string url) =>
        client.PatchAsync(url, content: null);

    public static Task<HttpResponseMessage> PatchAsJsonAsync<T>(this HttpClient client, string url, T body) =>
        client.PatchAsync(url, JsonContent.Create(body));

    public static async Task<T> ReadAsync<T>(this HttpResponseMessage response)
    {
        var value = await response.Content.ReadFromJsonAsync<T>(Json);
        return value ?? throw new InvalidOperationException("Response body was empty.");
    }

    // Asserts the status and the shared error envelope: { code, message, details }.
    public static async Task<ErrorResponse> ShouldFailAsync(
        this HttpResponseMessage response, HttpStatusCode status, string code)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == status, $"Expected {(int)status} but got {(int)response.StatusCode}: {body}");

        var error = JsonSerializer.Deserialize<ErrorResponse>(body, Json)!;
        Assert.Equal(code, error.Code);
        Assert.False(string.IsNullOrWhiteSpace(error.Message));
        return error;
    }

    public static async Task<ReservationResponse> ShouldSucceedAsync(
        this HttpResponseMessage response, HttpStatusCode status = HttpStatusCode.OK)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == status, $"Expected {(int)status} but got {(int)response.StatusCode}: {body}");
        return JsonSerializer.Deserialize<ReservationResponse>(body, Json)!;
    }

    // The body of a booking request built from a seeded slot.
    public static CreateReservationRequest BookingFor(string nic, EnergyBookingSlot slot, double energyKwh = 10) =>
        new(nic, slot.StationId, slot.Id, slot.SlotDate, slot.StartTime, slot.EndTime, energyKwh);
}
