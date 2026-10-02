using System.Net.Http.Headers;
using System.Net.Http.Json;
using MicrogridApi.Configuration;
using MicrogridApi.DTOs.Auth;
using MicrogridApi.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;
using Xunit;

namespace MicrogridApi.Tests.Infrastructure;

// One API host and one throw-away database for the whole test run. Every test seeds
// its own stations, slots and users with unique ids, so tests never depend on each other.
public sealed class ApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string Password = "Test@12345";

    private static int _sequence = 100_000;
    private readonly string? _connection = Environment.GetEnvironmentVariable(MongoFactAttribute.EnvironmentVariable);
    private readonly string _database = $"SolarGridX_Test_{Guid.NewGuid():N}";
    private MongoDbContext? _context;

    public ApiFixture()
    {
        if (string.IsNullOrWhiteSpace(_connection))
        {
            return;
        }

        // Program reads configuration from environment variables, so set them before the host is built.
        Set("MongoDbSettings__ConnectionString", _connection);
        Set("MongoDbSettings__DatabaseName", _database);
        Set("JwtSettings__Secret", "integration-test-jwt-secret-at-least-32-characters-long");
        Set("JwtSettings__Issuer", "SolarGridXTests");
        Set("JwtSettings__Audience", "SolarGridXTestClients");
        Set("JwtSettings__ExpiryMinutes", "60");
        Set("QrSettings__HmacSecret", "integration-test-qr-secret-at-least-32-characters-long");
        Set("SeedAdmin__Email", "admin@test.local");
        Set("SeedAdmin__Password", Password);
        Set("SeedAdmin__FullName", "Test Administrator");
        // Every test signs in, all from the same address; RateLimitTests builds its own strict host.
        Set("RateLimiting__AuthPermitLimit", "100000");
    }

    public Task InitializeAsync() => Task.CompletedTask;

    // Drops the throw-away database once the run is over.
    public new async Task DisposeAsync()
    {
        if (!string.IsNullOrWhiteSpace(_connection))
        {
            await new MongoClient(_connection).DropDatabaseAsync(_database);
        }

        await base.DisposeAsync();
    }

    private MongoDbContext Context => _context ??= Services.GetRequiredService<MongoDbContext>();

    // ---- seeding -------------------------------------------------------------------------

    public sealed record Account(string Id, string Nic, string Email);

    public async Task<Account> SeedProsumerAsync(UserStatus status = UserStatus.Active)
    {
        var number = Interlocked.Increment(ref _sequence);
        var nic = $"9{number:D8}V";
        var user = new User
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Nic = nic,
            Email = $"prosumer{number}@test.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password, 4),
            FullName = $"Prosumer {number}",
            Role = Role.Prosumer,
            Status = status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Context.GetCollection<User>("Users").InsertOneAsync(user);
        return new Account(user.Id, nic, user.Email!);
    }

    public async Task<Account> SeedOperatorAsync()
    {
        var number = Interlocked.Increment(ref _sequence);
        var user = new User
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Email = $"operator{number}@test.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password, 4),
            FullName = $"Operator {number}",
            Role = Role.GridOperator,
            Status = UserStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Context.GetCollection<User>("Users").InsertOneAsync(user);
        return new Account(user.Id, string.Empty, user.Email!);
    }

    public async Task<SolarStationInfo> SeedStationAsync(int batteryBays = 4, StationStatus status = StationStatus.Active)
    {
        var number = Interlocked.Increment(ref _sequence);
        var station = new SolarStationInfo
        {
            Id = ObjectId.GenerateNewId().ToString(),
            StationName = $"Test Hub {number}",
            Location = "Test Road, Colombo",
            Latitude = 6.9271,
            Longitude = 79.8612,
            CapacityKwh = 120,
            BatterySlotCount = batteryBays,
            Type = StationType.AC,
            OperationalSchedule = new OperationalSchedule
            {
                OpenTime = "06:00",
                CloseTime = "22:00",
                ActiveDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            },
            Status = status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Context.GetCollection<SolarStationInfo>("SolarStationInfo").InsertOneAsync(station);
        return station;
    }

    // A one-hour slot that starts at the given UTC instant (to the minute).
    public async Task<EnergyBookingSlot> SeedSlotAsync(
        string stationId, DateTime startsAtUtc, double capacityKwh = 30, bool available = true)
    {
        var slot = new EnergyBookingSlot
        {
            Id = ObjectId.GenerateNewId().ToString(),
            StationId = stationId,
            SlotDate = DateTime.SpecifyKind(startsAtUtc.Date, DateTimeKind.Utc),
            StartTime = startsAtUtc.ToString("HH:mm"),
            EndTime = startsAtUtc.AddHours(1).ToString("HH:mm"),
            CapacityKwh = capacityKwh,
            IsAvailable = available,
            ReservedCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Context.GetCollection<EnergyBookingSlot>("EnergyBookingSlots").InsertOneAsync(slot);
        return slot;
    }

    // Inserts a reservation straight into MongoDB, for states the API cannot reach quickly.
    public async Task<EnergyReservation> SeedReservationAsync(
        string nic, EnergyBookingSlot slot, ReservationStatus status, double energyKwh = 10)
    {
        var reservation = new EnergyReservation
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Nic = nic,
            StationId = slot.StationId,
            SlotId = slot.Id,
            ReservationDate = slot.SlotDate,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            EnergyKwh = energyKwh,
            Status = status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Context.GetCollection<EnergyReservation>("EnergyReservation").InsertOneAsync(reservation);
        return reservation;
    }

    public async Task<int> ReservedCountAsync(string slotId) =>
        (await Context.GetCollection<EnergyBookingSlot>("EnergyBookingSlots")
            .Find(s => s.Id == slotId).FirstAsync()).ReservedCount;

    // ---- clients -------------------------------------------------------------------------

    // Signs in through the real login endpoint and returns a client that carries the token.
    public async Task<HttpClient> ClientForAsync(Account account, string password = Password) =>
        ClientWithToken((await LoginAsync(account.Email, password)).Token);

    public async Task<LoginResponse> LoginAsync(string email, string password = Password)
    {
        var response = await CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<LoginResponse>())!;
    }

    public HttpClient ClientWithToken(string token)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    public static Account Admin => new(string.Empty, string.Empty, "admin@test.local");

    // Direct access for tests that must set up or inspect state the API never exposes.
    public IMongoCollection<T> Collection<T>(string name) => Context.GetCollection<T>(name);

    public Task<User> UserAsync(string id) =>
        Collection<User>("Users").Find(u => u.Id == id).FirstAsync();

    private static void Set(string name, string value) => Environment.SetEnvironmentVariable(name, value);
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFixture>
{
    public const string Name = "api";
}
