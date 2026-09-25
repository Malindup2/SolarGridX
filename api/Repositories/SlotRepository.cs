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

    // Ensures every date used for storage or comparison is an unambiguous
    // UTC midnight value, regardless of how it arrived (JSON body, existing
    // document, etc.). This avoids inconsistent timezone conversion by the
    // MongoDB driver when DateTime.Kind is Unspecified.
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

    // Interval-overlap check: an existing slot overlaps a candidate slot when
    // existing.Start < candidate.End AND existing.End > candidate.Start.
    // Works correctly because times are stored as zero-padded "HH:mm" strings,
    // which sort/compare lexically the same as they would numerically.
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

    
    public Task AdjustReservedCountAsync(string id, int delta) =>
        _slots.UpdateOneAsync(
            s => s.Id == id && s.ReservedCount >= (delta < 0 ? -delta : 0),
            Builders<EnergyBookingSlot>.Update
                .Inc(s => s.ReservedCount, delta)
                .Set(s => s.UpdatedAt, DateTime.UtcNow));

    public Task DeleteAsync(string id) => _slots.DeleteOneAsync(s => s.Id == id);
}