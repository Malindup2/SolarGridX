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