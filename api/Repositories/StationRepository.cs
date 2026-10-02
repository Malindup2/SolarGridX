/*
 * StationRepository.cs
 * Saves station records to the SolarStationInfo collection in MongoDB.
 */

using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MongoDB.Driver;

namespace MicrogridApi.Repositories;

public sealed class StationRepository
{
    // Use the station, slot, and reservation collections for station operations.
    private readonly IMongoCollection<SolarStationInfo> _stations;
    private readonly IMongoCollection<EnergyBookingSlot> _slots;
    private readonly IMongoCollection<EnergyReservation> _reservations;

    public StationRepository(MongoDbContext context)
    {

        _stations = context.GetCollection<SolarStationInfo>("SolarStationInfo");
        _slots = context.GetCollection<EnergyBookingSlot>("EnergyBookingSlots");
        _reservations = context.GetCollection<EnergyReservation>("EnergyReservation");

    }

    // Inserts a new station.
    public Task CreateAsync(SolarStationInfo station)
    {

        return _stations.InsertOneAsync(station);
    }

    // Returns all stations sorted by name.
    public Task<List<SolarStationInfo>> GetAllAsync()
    {

        return _stations.Find(Builders<SolarStationInfo>.Filter.Empty)
            .SortBy(station => station.StationName)
            .ToListAsync();
    }

    // Name or address contains the (already escaped) pattern, case-insensitive.
    public Task<List<SolarStationInfo>> SearchAsync(string pattern, bool activeOnly, int limit)
    {
        var builder = Builders<SolarStationInfo>.Filter;
        var regex = new MongoDB.Bson.BsonRegularExpression(pattern, "i");
        var filter = builder.Or(builder.Regex(s => s.StationName, regex), builder.Regex(s => s.Location, regex));

        if (activeOnly)
        {
            filter &= builder.Eq(s => s.Status, StationStatus.Active);
        }

        return _stations.Find(filter, new FindOptions { MaxTime = TimeSpan.FromSeconds(2) })
            .SortBy(s => s.StationName)
            .Limit(limit)
            .ToListAsync();
    }

    // Returns active stations.
    public Task<List<SolarStationInfo>> GetActiveAsync()
    {
        return _stations
            .Find(station => station.Status == StationStatus.Active)
            .ToListAsync();
    }

    // Find the station with the ID.
    public async Task<SolarStationInfo?> FindByIdAsync(string id)
    {

        return await _stations
            .Find(station => station.Id == id)
            .FirstOrDefaultAsync();
    }

    // Returns future slots and today's slots that have not ended.
    public async Task<List<EnergyBookingSlot>> GetUpcomingSlotsAsync(
        string stationId, DateTime today, string currentTime)
    {

        var tomorrow = today.AddDays(1);
        var filter = Builders<EnergyBookingSlot>.Filter.Eq(
                slot => slot.StationId, stationId) &
            (Builders<EnergyBookingSlot>.Filter.Gte(
                slot => slot.SlotDate, tomorrow) |
            (Builders<EnergyBookingSlot>.Filter.Gte(
                slot => slot.SlotDate, today) &
            Builders<EnergyBookingSlot>.Filter.Lt(
                slot => slot.SlotDate, tomorrow) &
            Builders<EnergyBookingSlot>.Filter.Gt(
                slot => slot.EndTime, currentTime)));

        return await _slots.Find(filter).ToListAsync();
    }

    // Returns pending and approved reservations for a station.
    public Task<List<EnergyReservation>> GetActiveReservationsAsync(
        string stationId)
    {

        var filter = Builders<EnergyReservation>.Filter.Eq(
                reservation => reservation.StationId, stationId) &
            Builders<EnergyReservation>.Filter.In(
                reservation => reservation.Status,
                new[] { ReservationStatus.Pending, ReservationStatus.Approved });

        return _reservations.Find(filter)
            .SortBy(reservation => reservation.ReservationDate)
            .ToListAsync();
    }

    // Updates a station's editable details.
    public async Task<SolarStationInfo?> UpdateDetailsAsync(
        string id,
        string stationName,
        string location,
        double latitude,
        double longitude,
        double capacityKwh,
        int batterySlotCount,
        StationType type)
    {

        var update = Builders<SolarStationInfo>.Update
            .Set(station => station.StationName, stationName)
            .Set(station => station.Location, location)
            .Set(station => station.Latitude, latitude)
            .Set(station => station.Longitude, longitude)
            .Set(station => station.CapacityKwh, capacityKwh)
            .Set(station => station.BatterySlotCount, batterySlotCount)
            .Set(station => station.Type, type)
            .Set(station => station.UpdatedAt, DateTime.UtcNow);

        return await _stations.FindOneAndUpdateAsync(
            station => station.Id == id,
            update,
            new FindOneAndUpdateOptions<SolarStationInfo>
            {
                ReturnDocument = ReturnDocument.After
            });
    }

    // Updates a station's operating schedule.
    public async Task<SolarStationInfo?> UpdateScheduleAsync(
        string id, OperationalSchedule schedule)
    {

        var update = Builders<SolarStationInfo>.Update
            .Set(station => station.OperationalSchedule, schedule)
            .Set(station => station.UpdatedAt, DateTime.UtcNow);

        return await _stations.FindOneAndUpdateAsync(
            station => station.Id == id,
            update,
            new FindOneAndUpdateOptions<SolarStationInfo>
            {
                ReturnDocument = ReturnDocument.After
            });
    }


    // Changes a station's status.
    public async Task<SolarStationInfo?> SetStatusAsync(
        string id, StationStatus status)
    {

        var update = Builders<SolarStationInfo>.Update
            .Set(station => station.Status, status)
            .Set(station => station.UpdatedAt, DateTime.UtcNow);

        return await _stations.FindOneAndUpdateAsync(
            station => station.Id == id,
            update,
            new FindOneAndUpdateOptions<SolarStationInfo>
            {
                ReturnDocument = ReturnDocument.After
            });
    }

    // Checks whether any slot references the station.
    public async Task<bool> HasAnySlotsAsync(string stationId)
    {

        var filter = Builders<EnergyBookingSlot>.Filter.Eq(
            slot => slot.StationId, stationId);

        return await _slots.CountDocumentsAsync(
            filter, new CountOptions { Limit = 1 }) > 0;
    }

    // Checks whether any reservation references the station.
    public async Task<bool> HasAnyReservationsAsync(string stationId)
    {

        var filter = Builders<EnergyReservation>.Filter.Eq(
            reservation => reservation.StationId, stationId);

        return await _reservations.CountDocumentsAsync(
            filter, new CountOptions { Limit = 1 }) > 0;
    }

    // Deletes a station by ID.
    public async Task<bool> DeleteByIdAsync(string id)
    {

        var result = await _stations.DeleteOneAsync(
            station => station.Id == id);

        return result.DeletedCount > 0;
    }


}