/*
 * SlotRepository.cs
 * Saves and queries booking slot records in the EnergyBookingSlots collection.
 */

using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MongoDB.Driver;

namespace MicrogridApi.Repositories;

public class SlotRepository
{
    private readonly IMongoCollection<EnergyBookingSlot> _slots;

    public SlotRepository(MongoDbContext context)
    {
                // Bind to the shared EnergyBookingSlots collection.

        _slots = context.GetCollection<EnergyBookingSlot>("EnergyBookingSlots");
    }

            // Force the date to midnight UTC so stored and compared dates always match.

    private static DateTime NormalizeDate(DateTime date) =>
        DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);

            // Insert a single manually created slot.

    public Task CreateAsync(EnergyBookingSlot slot) => _slots.InsertOneAsync(slot);

            // Insert a full day's worth of generated slots in one write.

    public Task CreateManyAsync(IEnumerable<EnergyBookingSlot> slots) => _slots.InsertManyAsync(slots);

            // Find the slot with the given ID.

    public Task<EnergyBookingSlot?> FindByIdAsync(string id) =>
        _slots.Find(s => s.Id == id).FirstOrDefaultAsync()!;

            // Return every slot for a station, ordered by date and time.

    public Task<List<EnergyBookingSlot>> FindByStationAsync(string stationId) =>
        _slots.Find(s => s.StationId == stationId)
              .SortBy(s => s.SlotDate).ThenBy(s => s.StartTime)
              .ToListAsync();

    public Task<List<EnergyBookingSlot>> FindByStationAndDateAsync(string stationId, DateTime date)
    {
                // Used to detect whether slots already exist for this station and date.

        var normalized = NormalizeDate(date);
        return _slots.Find(s => s.StationId == stationId && s.SlotDate == normalized).ToListAsync();
    }

    public async Task<List<EnergyBookingSlot>> FindAsync(DateTime? date, bool? isAvailable)
    {
                // Build an optional filter from the date and availability query params.

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
                //  check whether an existing slot's time range overlaps the candidate.

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

            // Save an updated slot document back in full.

    public Task ReplaceAsync(EnergyBookingSlot slot) =>
        _slots.ReplaceOneAsync(s => s.Id == slot.Id, slot);

            // Toggle a single slot online or offline.

    public Task UpdateAvailabilityAsync(string id, bool isAvailable) =>
        _slots.UpdateOneAsync(
            s => s.Id == id,
            Builders<EnergyBookingSlot>.Update
                .Set(s => s.IsAvailable, isAvailable)
                .Set(s => s.UpdatedAt, DateTime.UtcNow));

            // Toggle several slots online or offline at once, e.g. for maintenance.

    public Task UpdateManyAvailabilityAsync(IEnumerable<string> ids, bool isAvailable) =>
        _slots.UpdateManyAsync(
            Builders<EnergyBookingSlot>.Filter.In(s => s.Id, ids),
            Builders<EnergyBookingSlot>.Update
                .Set(s => s.IsAvailable, isAvailable)
                .Set(s => s.UpdatedAt, DateTime.UtcNow));

            // Remove the slot document entirely.

    public Task DeleteAsync(string id) => _slots.DeleteOneAsync(s => s.Id == id);

    // Atomically increments or decrements
    // a slot's reserved count. Called by ReservationService when a
    // reservation is created, rejected, cancelled, or rescheduled onto a
    // different slot — this is the single place ReservedCount is mutated, so
    // delete/capacity-reduction checks in this file always see a
    // consistent value.
    public Task AdjustReservedCountAsync(string slotId, int delta)
    {
                // Build a filter on the slot, guarding decrements from going below zero.

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
                // Atomically claim one bay only if the slot is online and not yet full.

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