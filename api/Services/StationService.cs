/*
 * StationService.cs
 * Applies station registration rules and prepares the response after saving.
 */

using FluentValidation;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Stations;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using MongoDB.Bson;
using System.Globalization;

namespace MicrogridApi.Services;

public sealed class StationService(
    StationRepository stationRepository,
    IValidator<CreateStationRequest> createValidator,
    IValidator<NearbyStationsQuery> nearbyValidator,
    IValidator<UpdateStationRequest> updateValidator)
{
    public async Task<Result<StationResponse>> CreateAsync(
        CreateStationRequest request)
    {
        // Validate the complete request before creating a station document
        var validation = await createValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            return Error.Validation(
                "VALIDATION_FAILED",
                "One or more validation errors occurred.",
                validation.Errors
                    .Select(error =>
                        $"{error.PropertyName}: {error.ErrorMessage}")
                    .ToArray());
        }

        var schedule = request.OperationalSchedule!;
        var now = DateTime.UtcNow;

        var station = new SolarStationInfo
        {
            Id = ObjectId.GenerateNewId().ToString(),
            StationName = request.StationName!.Trim(),
            Location = request.Location!.Trim(),
            Latitude = request.Latitude!.Value,
            Longitude = request.Longitude!.Value,
            CapacityKwh = request.CapacityKwh!.Value,
            BatterySlotCount = request.BatterySlotCount!.Value,
            Type = Enum.Parse<StationType>(request.Type!),
            OperationalSchedule = new OperationalSchedule
            {
                OpenTime = schedule.OpenTime!,
                CloseTime = schedule.CloseTime!,
                ActiveDays = schedule.ActiveDays!
                    .Select(day => Enum.Parse<DayOfWeek>(
                        day.Trim(), ignoreCase: true).ToString())
                    .ToList()
            },
            Status = StationStatus.Active,
            CreatedAt = now,
            UpdatedAt = now
        };

        await stationRepository.CreateAsync(station);

        return new StationResponse(
            station.Id,
            station.StationName,
            station.Location,
            station.Latitude,
            station.Longitude,
            station.CapacityKwh,
            station.BatterySlotCount,
            station.Type.ToString(),
            new StationScheduleResponse(
                station.OperationalSchedule.OpenTime,
                station.OperationalSchedule.CloseTime,
                station.OperationalSchedule.ActiveDays),
            station.Status.ToString(),
            station.CreatedAt,
            station.UpdatedAt);
    }

    public async Task<Result<List<StationResponse>>> GetAllAsync()
    {
        // Read station records and return all
        var stations = await stationRepository.GetAllAsync();

        return stations.Select(station => new StationResponse(
            station.Id,
            station.StationName,
            station.Location,
            station.Latitude,
            station.Longitude,
            station.CapacityKwh,
            station.BatterySlotCount,
            station.Type.ToString(),
            new StationScheduleResponse(
                station.OperationalSchedule.OpenTime,
                station.OperationalSchedule.CloseTime,
                station.OperationalSchedule.ActiveDays),
            station.Status.ToString(),
            station.CreatedAt,
            station.UpdatedAt)).ToList();
    }


    public async Task<Result<List<StationResponse>>> GetNearbyAsync(
        double? lat, double? lng, double? radiusKm)
    {
        // Validate the search area before looking up active stations.
        var query = new NearbyStationsQuery(lat, lng, radiusKm);
        var validation = await nearbyValidator.ValidateAsync(query);

        if (!validation.IsValid)
        {
            return Error.Validation(
                "VALIDATION_FAILED",
                "One or more validation errors occurred.",
                validation.Errors
                    .Select(error =>
                        $"{error.PropertyName}: {error.ErrorMessage}")
                    .ToArray());
        }

        var activeStations = await stationRepository.GetActiveAsync();

        // Keep stations within the requested distance and put the nearest first.
        var nearby = activeStations
            .Select(station => new
            {
                Station = station,
                DistanceKm = DistanceKm(
                    lat!.Value, lng!.Value,
                    station.Latitude, station.Longitude)
            })
            .Where(item => item.DistanceKm <= radiusKm!.Value)
            .OrderBy(item => item.DistanceKm)
            .ThenBy(item => item.Station.StationName)
            .Select(item => new StationResponse(
                item.Station.Id,
                item.Station.StationName,
                item.Station.Location,
                item.Station.Latitude,
                item.Station.Longitude,
                item.Station.CapacityKwh,
                item.Station.BatterySlotCount,
                item.Station.Type.ToString(),
                new StationScheduleResponse(
                    item.Station.OperationalSchedule.OpenTime,
                    item.Station.OperationalSchedule.CloseTime,
                    item.Station.OperationalSchedule.ActiveDays),
                item.Station.Status.ToString(),
                item.Station.CreatedAt,
                item.Station.UpdatedAt))
            .ToList();

        return nearby;
    }



    public async Task<Result<StationResponse>> GetByIdAsync(string id)
    {
        // Reject an invalid MongoDB ID before querying the station collection.
        if (!ObjectId.TryParse(id, out _))
        {
            return Error.Validation(
                "VALIDATION_FAILED",
                "The station ID is invalid.",
                ["id: Station ID must be a valid MongoDB ObjectId."]);
        }

        var station = await stationRepository.FindByIdAsync(id);
        if (station is null)
        {
            return Error.NotFound(
                "STATION_NOT_FOUND",
                "No station exists with the requested ID.");
        }

        // Return the station.
        return new StationResponse(
            station.Id,
            station.StationName,
            station.Location,
            station.Latitude,
            station.Longitude,
            station.CapacityKwh,
            station.BatterySlotCount,
            station.Type.ToString(),
            new StationScheduleResponse(
                station.OperationalSchedule.OpenTime,
                station.OperationalSchedule.CloseTime,
                station.OperationalSchedule.ActiveDays),
            station.Status.ToString(),
            station.CreatedAt,
            station.UpdatedAt);
    }



    public async Task<Result<StationResponse>> UpdateAsync(
        string id, UpdateStationRequest request)
    {
        // Validate the station ID and requested values before changing any data.
        if (!ObjectId.TryParse(id, out _))
        {
            return Error.Validation(
                "VALIDATION_FAILED",
                "The station ID is invalid.",
                ["id: Station ID must be a valid MongoDB ObjectId."]);
        }

        var validation = await updateValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            return Error.Validation(
                "VALIDATION_FAILED",
                "One or more validation errors occurred.",
                validation.Errors
                    .Select(error =>
                        $"{error.PropertyName}: {error.ErrorMessage}")
                    .ToArray());
        }

        var current = await stationRepository.FindByIdAsync(id);
        if (current is null)
        {
            return Error.NotFound(
                "STATION_NOT_FOUND",
                "No station exists with the requested ID.");
        }

        var reducingCapacity =
            request.CapacityKwh!.Value < current.CapacityKwh ||
            request.BatterySlotCount!.Value < current.BatterySlotCount;

        if (reducingCapacity)
        {
            
            var localNow = DateTimeOffset.UtcNow.ToOffset(
                TimeSpan.FromMinutes(330));
            var today = new DateTime(
                localNow.Year, localNow.Month, localNow.Day,
                0, 0, 0, DateTimeKind.Utc);
            var currentTime = localNow.ToString(
                "HH:mm", CultureInfo.InvariantCulture);

            var hasSlots = await stationRepository.HasUpcomingSlotsAsync(
                id, today, currentTime);
            var hasReservations =
                await stationRepository.HasUpcomingActiveReservationsAsync(
                    id, today, currentTime);

            if (hasSlots || hasReservations)
            {
                return Error.Conflict(
                    "STATION_CAPACITY_REDUCTION_BLOCKED",
                    "Capacity or battery-slot count cannot be reduced while upcoming slots or active reservations exist.");
            }
        }

        // Translate the validated request into values the repository can save.
        var updated = await stationRepository.UpdateDetailsAsync(
            id,
            request.StationName!.Trim(),
            request.Location!.Trim(),
            request.Latitude!.Value,
            request.Longitude!.Value,
            request.CapacityKwh!.Value,
            request.BatterySlotCount!.Value,
            Enum.Parse<StationType>(request.Type!));

        if (updated is null)
        {
            return Error.NotFound(
                "STATION_NOT_FOUND",
                "The station was removed before it could be updated.");
        }

        return new StationResponse(
            updated.Id,
            updated.StationName,
            updated.Location,
            updated.Latitude,
            updated.Longitude,
            updated.CapacityKwh,
            updated.BatterySlotCount,
            updated.Type.ToString(),
            new StationScheduleResponse(
                updated.OperationalSchedule.OpenTime,
                updated.OperationalSchedule.CloseTime,
                updated.OperationalSchedule.ActiveDays),
            updated.Status.ToString(),
            updated.CreatedAt,
            updated.UpdatedAt);
    }




    private static double DistanceKm(
        double fromLat, double fromLng,
        double toLat, double toLng)
    {
        // Use the great-circle distance between two GPS points.
        const double earthRadiusKm = 6371.0;
        const double radiansPerDegree = Math.PI / 180.0;

        var latDifference = (toLat - fromLat) * radiansPerDegree;
        var lngDifference = (toLng - fromLng) * radiansPerDegree;
        var fromLatRadians = fromLat * radiansPerDegree;
        var toLatRadians = toLat * radiansPerDegree;

        var a =
            Math.Pow(Math.Sin(latDifference / 2), 2) +
            Math.Cos(fromLatRadians) * Math.Cos(toLatRadians) *
            Math.Pow(Math.Sin(lngDifference / 2), 2);

        return 2 * earthRadiusKm *
            Math.Asin(Math.Min(1.0, Math.Sqrt(a)));
    }

}