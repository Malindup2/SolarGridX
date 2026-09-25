/*
 * ReservationRepository.cs
 * MongoDB data access for the EnergyReservation collection.
 */

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

    // Stores a newly created reservation.
    public Task CreateAsync(EnergyReservation reservation) =>
        _reservations.InsertOneAsync(reservation);

    // Returns one reservation, or null when no document carries the given id.
    public Task<EnergyReservation?> FindByIdAsync(string id) =>
        _reservations.Find(r => r.Id == id).FirstOrDefaultAsync()!;

    // Returns reservations matching any combination of the optional filters,
    // latest scheduled date first.
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

    // True when the NIC already holds a Pending or Approved reservation for the
    // slot, so the same prosumer cannot book one slot twice.
    public Task<bool> ExistsLiveForSlotAsync(string nic, string slotId) =>
        _reservations.Find(r =>
            r.Nic == nic &&
            r.SlotId == slotId &&
            (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved))
            .AnyAsync();

    // Replaces the whole document after a service-layer state change.
    public Task ReplaceAsync(EnergyReservation reservation) =>
        _reservations.ReplaceOneAsync(r => r.Id == reservation.Id, reservation);

    // Stores the QR token issued once a reservation is approved.
    public Task SetQrTokenAsync(string id, string qrToken) =>
        _reservations.UpdateOneAsync(
            r => r.Id == id,
            Builders<EnergyReservation>.Update
                .Set(r => r.QrToken, qrToken)
                .Set(r => r.UpdatedAt, DateTime.UtcNow));
}
