using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MongoDB.Driver;

namespace MicrogridApi.Repositories;

// NOTE (Member 4): Minimal, read-only repository — created only so slot
// generation can read a station's operational schedule and capacity.
// Member 3 owns StationController/StationService and will need a fuller
// StationRepository. Coordinate before merging into dev: extend this file
// rather than creating a second repository against the same collection.
public class StationRepository
{
    private readonly IMongoCollection<SolarStationInfo> _stations;

    public StationRepository(MongoDbContext context)
    {
        _stations = context.GetCollection<SolarStationInfo>("SolarStationInfo");
    }

    public Task<SolarStationInfo?> FindByIdAsync(string id) =>
        _stations.Find(s => s.Id == id).FirstOrDefaultAsync()!;

    public Task<List<SolarStationInfo>> FindAllAsync() =>
    _stations.Find(FilterDefinition<SolarStationInfo>.Empty).ToListAsync();
}