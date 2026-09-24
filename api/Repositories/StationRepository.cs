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

    public Task CreateAsync(SolarStationInfo station)
    {
        // Save the station after the service has validated its request.
        return _stations.InsertOneAsync(station);
    }

    public Task<List<SolarStationInfo>> GetAllAsync()
    {
        // Return all stations.
        return _stations.Find(Builders<SolarStationInfo>.Filter.Empty)
            .SortBy(station => station.StationName)
            .ToListAsync();
    }

    public Task<List<SolarStationInfo>> GetActiveAsync()
    {
        // Read only stations that are currently available to visitors.
        return _stations
            .Find(station => station.Status == StationStatus.Active)
            .ToListAsync();
    }

    public async Task<SolarStationInfo?> FindByIdAsync(string id)
    {
        // Find the station with the ID.
        return await _stations
            .Find(station => station.Id == id)
            .FirstOrDefaultAsync();
    }


    public async Task<List<EnergyBookingSlot>> GetUpcomingSlotsAsync(
        string stationId, DateTime today, string currentTime)
    {
        // Read later slots and today's slots that have not ended.
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



    public Task<List<EnergyReservation>> GetActiveReservationsAsync(
        string stationId)
    {
        // Find Pending and Approved reservations that block deactivation.
        var filter = Builders<EnergyReservation>.Filter.Eq(
                reservation => reservation.StationId, stationId) &
            Builders<EnergyReservation>.Filter.In(
                reservation => reservation.Status,
                new[] { ReservationStatus.Pending, ReservationStatus.Approved });

        return _reservations.Find(filter)
            .SortBy(reservation => reservation.ReservationDate)
            .ToListAsync();
    }



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
        // Update editable station details 
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




    public async Task<SolarStationInfo?> UpdateScheduleAsync(
        string id, OperationalSchedule schedule)
    {
        // Save the schedule without changing other station fields.
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




    public async Task<SolarStationInfo?> SetStatusAsync(
        string id, StationStatus status)
    {
        // Save the requested station status and update timestamp.
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
  

}