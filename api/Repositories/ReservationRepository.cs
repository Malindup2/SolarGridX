using MicrogridApi.Common;
using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MongoDB.Driver;

namespace MicrogridApi.Repositories;

public class ReservationRepository
{
    private readonly IMongoCollection<EnergyReservation> _reservations;

    public ReservationRepository(MongoDbContext context)
    {
        _reservations = context.GetCollection<EnergyReservation>("EnergyReservation");
    }

    
    public Task CreateAsync(EnergyReservation reservation) =>
        _reservations.InsertOneAsync(reservation);

    
    public Task<EnergyReservation?> FindByIdAsync(string id) =>
        _reservations.Find(r => r.Id == id).FirstOrDefaultAsync()!;


    public async Task<List<EnergyReservation>> FindAsync(
        string? nic, ReservationStatus? status, string? stationId)
    {
        var builder = Builders<EnergyReservation>.Filter;
        var filter = builder.Empty;

        if (!string.IsNullOrWhiteSpace(nic))
        {
            filter &= builder.Eq(r => r.Nic, nic);
        }

        if (status.HasValue)
        {
            filter &= builder.Eq(r => r.Status, status.Value);
        }

        if (!string.IsNullOrWhiteSpace(stationId))
        {
            filter &= builder.Eq(r => r.StationId, stationId);
        }

        return await _reservations.Find(filter)
            .SortByDescending(r => r.ReservationDate)
            .ThenBy(r => r.StartTime)
            .ToListAsync();
    }

    // Candidates for a booking view, narrowed in MongoDB by status and slot day. The service then
    // applies the exact end-time check, because the end is stored as a day plus an "HH:mm" string.
    public Task<List<EnergyReservation>> FindViewCandidatesAsync(
        IReadOnlyCollection<ReservationStatus> statuses, string? nic, string? stationId,
        DateTime? dayOnOrAfter, DateTime? dayOnOrBefore)
    {
        var builder = Builders<EnergyReservation>.Filter;
        var filter = builder.In(r => r.Status, statuses);

        if (!string.IsNullOrWhiteSpace(nic))
        {
            filter &= builder.Eq(r => r.Nic, nic);
        }

        if (!string.IsNullOrWhiteSpace(stationId))
        {
            filter &= builder.Eq(r => r.StationId, stationId);
        }

        if (dayOnOrAfter.HasValue)
        {
            filter &= builder.Gte(r => r.ReservationDate, DateTime.SpecifyKind(dayOnOrAfter.Value.Date, DateTimeKind.Utc));
        }

        if (dayOnOrBefore.HasValue)
        {
            filter &= builder.Lte(r => r.ReservationDate, DateTime.SpecifyKind(dayOnOrBefore.Value.Date, DateTimeKind.Utc));
        }

        return _reservations.Find(filter).ToListAsync();
    }

    // Export: every reservation matching the list filters, capped by the caller.
    public Task<List<EnergyReservation>> FindForExportAsync(
        string? nic, ReservationStatus? status, string? stationId, DateTime? dateFrom, DateTime? dateTo, int limit) =>
        SearchQuery(nic, status, stationId, dateFrom, dateTo).Limit(limit).ToListAsync();

    public Task<List<EnergyReservation>> SearchByIdOrNicAsync(string pattern, string? nic, int limit)
    {
        var builder = Builders<EnergyReservation>.Filter;
        var filter = builder.Regex(r => r.Nic, new MongoDB.Bson.BsonRegularExpression(pattern, "i"));

        // A full 24-character id typed into search finds that reservation directly.
        if (MongoDB.Bson.ObjectId.TryParse(pattern, out _))
        {
            filter |= builder.Eq(r => r.Id, pattern);
        }

        if (!string.IsNullOrWhiteSpace(nic))
        {
            filter &= builder.Eq(r => r.Nic, nic);
        }

        return _reservations.Find(filter, new FindOptions { MaxTime = TimeSpan.FromSeconds(2) })
            .SortByDescending(r => r.ReservationDate)
            .Limit(limit)
            .ToListAsync();
    }

    // Booking monitor query: the list filters plus an optional date range.
    public Task<List<EnergyReservation>> SearchAsync(
        string? nic, ReservationStatus? status, string? stationId,
        DateTime? dateFrom, DateTime? dateTo) =>
        SearchQuery(nic, status, stationId, dateFrom, dateTo).ToListAsync();

    private IFindFluent<EnergyReservation, EnergyReservation> SearchQuery(
        string? nic, ReservationStatus? status, string? stationId,
        DateTime? dateFrom, DateTime? dateTo)
    {
        var builder = Builders<EnergyReservation>.Filter;
        var filter = builder.Empty;

        if (!string.IsNullOrWhiteSpace(nic))
        {
            filter &= builder.Eq(r => r.Nic, nic);
        }

        if (status.HasValue)
        {
            filter &= builder.Eq(r => r.Status, status.Value);
        }

        if (!string.IsNullOrWhiteSpace(stationId))
        {
            filter &= builder.Eq(r => r.StationId, stationId);
        }

        if (dateFrom.HasValue)
        {
            filter &= builder.Gte(r => r.ReservationDate, DateTime.SpecifyKind(dateFrom.Value.Date, DateTimeKind.Utc));
        }

        if (dateTo.HasValue)
        {
            filter &= builder.Lte(r => r.ReservationDate, DateTime.SpecifyKind(dateTo.Value.Date, DateTimeKind.Utc));
        }

        return _reservations.Find(filter)
            .SortByDescending(r => r.ReservationDate)
            .ThenBy(r => r.StartTime);
    }

    // Counts reservations in one status, optionally for a single prosumer or
    // a single station, and optionally only those still in the future.
    public Task<long> CountAsync(
        ReservationStatus status, string? nic = null, string? stationId = null, bool futureOnly = false)
    {
        var builder = Builders<EnergyReservation>.Filter;
        var filter = builder.Eq(r => r.Status, status);

        if (!string.IsNullOrWhiteSpace(nic))
        {
            filter &= builder.Eq(r => r.Nic, nic);
        }

        if (!string.IsNullOrWhiteSpace(stationId))
        {
            filter &= builder.Eq(r => r.StationId, stationId);
        }

        if (futureOnly)
        {
            filter &= builder.Gte(r => r.ReservationDate, DateTime.SpecifyKind(BusinessClock.Today, DateTimeKind.Utc));
        }

        return _reservations.CountDocumentsAsync(filter);
    }

    public Task<bool> ExistsLiveForSlotAsync(string nic, string slotId) =>
        _reservations.Find(r =>
            r.Nic == nic &&
            r.SlotId == slotId &&
            (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved))
            .AnyAsync();

    // Replaces the whole document. Prefer ReplaceIfUnchangedAsync for anything that follows a read.
    public Task ReplaceAsync(EnergyReservation reservation) =>
        _reservations.ReplaceOneAsync(r => r.Id == reservation.Id, reservation);

    // Optimistic concurrency: saves only if nobody changed the reservation since it was read
    // (its UpdatedAt is still what we loaded). Returns false when someone else got there first,
    // so two operators approving / cancelling the same booking cannot overwrite each other.
    public async Task<bool> ReplaceIfUnchangedAsync(EnergyReservation reservation, DateTime loadedUpdatedAt)
    {
        var result = await _reservations.ReplaceOneAsync(
            r => r.Id == reservation.Id && r.UpdatedAt == loadedUpdatedAt,
            reservation);
        return result.ModifiedCount == 1;
    }

    // Completes a transfer only while the reservation is still Approved with this exact QR token.
    // One atomic update, so a code can never complete twice, even with two scans at once.
    public async Task<bool> TryCompleteAsync(string id, string qrToken, DateTime completedAt)
    {
        var result = await _reservations.UpdateOneAsync(
            r => r.Id == id && r.Status == ReservationStatus.Approved && r.QrToken == qrToken,
            Builders<EnergyReservation>.Update
                .Set(r => r.Status, ReservationStatus.Completed)
                .Set(r => r.CompletedAt, completedAt)
                .Set(r => r.UpdatedAt, completedAt));
        return result.ModifiedCount == 1;
    }

    // Does this prosumer already hold a live (Pending / Approved) booking whose time overlaps
    // [startTime, endTime) on the same day, in any slot? Times are "HH:mm", so they compare as text.
    public Task<bool> ExistsOverlappingAsync(string nic, DateTime day, string startTime, string endTime, string? excludeReservationId = null)
    {
        var builder = Builders<EnergyReservation>.Filter;
        var filter = builder.Eq(r => r.Nic, nic)
            & builder.Eq(r => r.ReservationDate, DateTime.SpecifyKind(day.Date, DateTimeKind.Utc))
            & builder.In(r => r.Status, new[] { ReservationStatus.Pending, ReservationStatus.Approved })
            & builder.Lt(r => r.StartTime, endTime)
            & builder.Gt(r => r.EndTime, startTime);

        if (excludeReservationId is not null)
        {
            filter &= builder.Ne(r => r.Id, excludeReservationId);
        }

        return _reservations.Find(filter).AnyAsync();
    }

    // Stores the QR token issued once a reservation approved.
    public Task SetQrTokenAsync(string id, string qrToken) =>
        _reservations.UpdateOneAsync(
            r => r.Id == id,
            Builders<EnergyReservation>.Update
                .Set(r => r.QrToken, qrToken)
                .Set(r => r.UpdatedAt, DateTime.UtcNow));
}