using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MongoDB.Driver;

namespace MicrogridApi.Repositories;

public class SlotRepository
{
    private readonly IMongoCollection<EnergyBookingSlot> _slots;

    public SlotRepository(MongoDbContext context)
    {
        _slots = context.GetCollection<EnergyBookingSlot>("EnergyBookingSlots");
    }

    private static DateTime NormalizeDate(DateTime date) =>
        DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);

    public Task CreateAsync(EnergyBookingSlot slot) => _slots.InsertOneAsync(slot);

    public Task CreateManyAsync(IEnumerable<EnergyBookingSlot> slots) => _slots.InsertManyAsync(slots);

    public Task<EnergyBookingSlot?> FindByIdAsync(string id) =>
        _slots.Find(s => s.Id == id).FirstOrDefaultAsync()!;

    public Task<List<EnergyBookingSlot>> FindByStationAsync(string stationId) =>
        _slots.Find(s => s.StationId == stationId)
              .SortBy(s => s.SlotDate).ThenBy(s => s.StartTime)
              .ToListAsync();

    public Task<List<EnergyBookingSlot>> FindByStationAndDateAsync(string stationId, DateTime date)
    {
        var normalized = NormalizeDate(date);
        return _slots.Find(s => s.StationId == stationId && s.SlotDate == normalized).ToListAsync();
    }

    public async Task<List<EnergyBookingSlot>> FindAsync(DateTime? date, bool? isAvailable)
    {
        var filterBuilder = Builders<EnergyBookingSlot>.Filter;
        var filter = filterBuilder.Empty;

        if (date.HasValue)
        {
            filter &= filterBuilder.Eq(s => s.SlotDate, NormalizeDate(date.Value));
        }

        if (isAvailable.HasValue)
        {
            filter &= filterBuilder.Eq(s => s.IsAvailable, isAvailable.Value);
        }

        return await _slots.Find(filter).SortBy(s => s.SlotDate).ThenBy(s => s.StartTime).ToListAsync();
    }

    public Task<bool> HasOverlapAsync(string stationId, DateTime date, string startTime, string endTime, string? excludeId = null)
    {
        var normalized = NormalizeDate(date);
        var filterBuilder = Builders<EnergyBookingSlot>.Filter;
        var filter = filterBuilder.Eq(s => s.StationId, stationId)
                   & filterBuilder.Eq(s => s.SlotDate, normalized)
                   & filterBuilder.Lt(s => s.StartTime, endTime)
                   & filterBuilder.Gt(s => s.EndTime, startTime);

        if (excludeId is not null)
        {
            filter &= filterBuilder.Ne(s => s.Id, excludeId);
        }

        return _slots.Find(filter).AnyAsync();
    }

    public Task ReplaceAsync(EnergyBookingSlot slot) =>
        _slots.ReplaceOneAsync(s => s.Id == slot.Id, slot);

    public Task UpdateAvailabilityAsync(string id, bool isAvailable) =>
        _slots.UpdateOneAsync(
            s => s.Id == id,
            Builders<EnergyBookingSlot>.Update
                .Set(s => s.IsAvailable, isAvailable)
                .Set(s => s.UpdatedAt, DateTime.UtcNow));

    public Task UpdateManyAvailabilityAsync(IEnumerable<string> ids, bool isAvailable) =>
        _slots.UpdateManyAsync(
            Builders<EnergyBookingSlot>.Filter.In(s => s.Id, ids),
            Builders<EnergyBookingSlot>.Update
                .Set(s => s.IsAvailable, isAvailable)
                .Set(s => s.UpdatedAt, DateTime.UtcNow));

    public Task DeleteAsync(string id) => _slots.DeleteOneAsync(s => s.Id == id);

    // Atomically increments (positive delta) or decrements (negative delta)
    // a slot's reserved count. Called by ReservationService when a
    // reservation is created, rejected, cancelled, or rescheduled onto a
    // different slot — this is the single place ReservedCount is mutated, so
    // BR-09's delete/capacity-reduction checks in this file always see a
    // consistent value.
    public Task AdjustReservedCountAsync(string slotId, int delta)
    {
        var builder = Builders<EnergyBookingSlot>.Filter;
        var filter = builder.Eq(s => s.Id, slotId);

        // A release can never push the count below zero, so a repeated release is harmless.
        if (delta < 0)
        {
            filter &= builder.Gte(s => s.ReservedCount, -delta);
        }

        return _slots.UpdateOneAsync(
            filter,
            Builders<EnergyBookingSlot>.Update
                .Inc(s => s.ReservedCount, delta)
                .Set(s => s.UpdatedAt, DateTime.UtcNow));
    }

    // Takes one battery bay in a single database operation: the check "is there a free bay?"
    // and the increment cannot be separated, so two bookings racing for the last bay can never
    // both succeed. Returns false when the slot is offline or already full.
    public async Task<bool> TryReserveAsync(string slotId, int bays)
    {
        var builder = Builders<EnergyBookingSlot>.Filter;
        var filter = builder.Eq(s => s.Id, slotId) & builder.Eq(s => s.IsAvailable, true);

        if (bays > 0)
        {
            filter &= builder.Lt(s => s.ReservedCount, bays);
        }

        var result = await _slots.UpdateOneAsync(
            filter,
            Builders<EnergyBookingSlot>.Update
                .Inc(s => s.ReservedCount, 1)
                .Set(s => s.UpdatedAt, DateTime.UtcNow));

        return result.ModifiedCount == 1;
    }
}