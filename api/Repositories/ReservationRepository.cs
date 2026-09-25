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

    // Booking monitor query: the list filters plus an optional date range.
    public async Task<List<EnergyReservation>> SearchAsync(
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

        return await _reservations.Find(filter)
            .SortByDescending(r => r.ReservationDate)
            .ThenBy(r => r.StartTime)
            .ToListAsync();
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
            filter &= builder.Gte(r => r.ReservationDate, DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc));
        }

        return _reservations.CountDocumentsAsync(filter);
    }

    public Task<bool> ExistsLiveForSlotAsync(string nic, string slotId) =>
        _reservations.Find(r =>
            r.Nic == nic &&
            r.SlotId == slotId &&
            (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved))
            .AnyAsync();

    // Replaces 
    public Task ReplaceAsync(EnergyReservation reservation) =>
        _reservations.ReplaceOneAsync(r => r.Id == reservation.Id, reservation);

    // Stores the QR token issued once a reservation approved.
    public Task SetQrTokenAsync(string id, string qrToken) =>
        _reservations.UpdateOneAsync(
            r => r.Id == id,
            Builders<EnergyReservation>.Update
                .Set(r => r.QrToken, qrToken)
                .Set(r => r.UpdatedAt, DateTime.UtcNow));
}