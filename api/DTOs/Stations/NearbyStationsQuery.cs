/*
 * NearbyStationsQuery.cs
 * Holds the coordinates and search radius for a nearby-station request.
 */

namespace MicrogridApi.DTOs.Stations;

public sealed record NearbyStationsQuery(
    double? Lat,
    double? Lng,
    double? RadiusKm);