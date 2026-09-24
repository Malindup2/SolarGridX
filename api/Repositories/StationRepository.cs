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
    private readonly IMongoCollection<SolarStationInfo> _stations;

    public StationRepository(MongoDbContext context)
    {
        
        _stations = context.GetCollection<SolarStationInfo>("SolarStationInfo");
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
}