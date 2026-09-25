using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MongoDB.Driver;

namespace MicrogridApi.Repositories;

// NOTE (Member 4): Minimal repository — created only so QR issuance can
// check a reservation's status and store the issued QrToken. Member 1 owns
// ReservationController/ReservationService and will need a fuller
// ReservationRepository (create/update/cancel). Coordinate before merging
// into dev: extend this file rather than creating a second repository
// against the same collection.
public class ReservationRepository
{
    private readonly IMongoCollection<EnergyReservation> _reservations;

    public ReservationRepository(MongoDbContext context)
    {
        _reservations = context.GetCollection<EnergyReservation>("EnergyReservation");
    }

    public Task<EnergyReservation?> FindByIdAsync(string id) =>
        _reservations.Find(r => r.Id == id).FirstOrDefaultAsync()!;

    public Task SetQrTokenAsync(string id, string qrToken) =>
        _reservations.UpdateOneAsync(
            r => r.Id == id,
            Builders<EnergyReservation>.Update
                .Set(r => r.QrToken, qrToken)
                .Set(r => r.UpdatedAt, DateTime.UtcNow));
}