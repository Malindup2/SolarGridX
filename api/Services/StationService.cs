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
    IValidator<UpdateStationRequest> updateValidator,
    IValidator<StationScheduleRequest> scheduleValidator)
{
    // Validates and creates a station.
    public async Task<Result<StationResponse>> CreateAsync(
        CreateStationRequest request)
    {

        var validation = await createValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            return StationErrors.ValidationFailed(validation.Errors
                .Select(error => $"{error.PropertyName}: {error.ErrorMessage}")
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

    // Returns all stations sorted by name.
    public async Task<Result<List<StationResponse>>> GetAllAsync()
    {

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

    // Finds active stations within the requested radius, nearest first.
    public async Task<Result<List<StationResponse>>> GetNearbyAsync(
        double? lat, double? lng, double? radiusKm)
    {

        var query = new NearbyStationsQuery(lat, lng, radiusKm);
        var validation = await nearbyValidator.ValidateAsync(query);

        if (!validation.IsValid)
        {
            return StationErrors.ValidationFailed(validation.Errors
                .Select(error => $"{error.PropertyName}: {error.ErrorMessage}")
                .ToArray());
        }

        var activeStations = await stationRepository.GetActiveAsync();


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

    // Retrieves a station by ID.
    public async Task<Result<StationResponse>> GetByIdAsync(string id)
    {

        if (!ObjectId.TryParse(id, out _))
        {
            return StationErrors.InvalidId;
        }

        var station = await stationRepository.FindByIdAsync(id);
        if (station is null)
        {
            return StationErrors.NotFound;
        }


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


    // Updates station details without invalidating upcoming slots.
    public async Task<Result<StationResponse>> UpdateAsync(
        string id, UpdateStationRequest request)
    {

        if (!ObjectId.TryParse(id, out _))
        {
            return StationErrors.InvalidId;
        }

        var validation = await updateValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            return StationErrors.ValidationFailed(validation.Errors
                .Select(error => $"{error.PropertyName}: {error.ErrorMessage}")
                .ToArray());
        }

        var current = await stationRepository.FindByIdAsync(id);
        if (current is null)
        {
            return StationErrors.NotFound;
        }

        var changeAffectsUpcomingSlots =
            request.CapacityKwh!.Value < current.CapacityKwh ||
            request.BatterySlotCount!.Value != current.BatterySlotCount;

        if (changeAffectsUpcomingSlots)
        {

            var upcomingSlots = await GetUpcomingSlotsAsync(id);
            if (upcomingSlots.Count > 0)
            {
                return StationErrors.CapacityChangeBlocked;
            }
        }


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
            return StationErrors.RemovedBeforeUpdate;
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

    // Updates operating hours and days when upcoming slots remain valid.
    public async Task<Result<StationResponse>> UpdateScheduleAsync(
        string id, StationScheduleRequest request)
    {

        if (!ObjectId.TryParse(id, out _))
        {
            return StationErrors.InvalidId;
        }

        var validation = await scheduleValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            return StationErrors.ValidationFailed(validation.Errors
                .Select(error => $"{error.PropertyName}: {error.ErrorMessage}")
                .ToArray());
        }

        var current = await stationRepository.FindByIdAsync(id);
        if (current is null)
        {
            return StationErrors.NotFound;
        }

        var activeDays = request.ActiveDays!
            .Select(day => Enum.Parse<DayOfWeek>(
                day.Trim(), ignoreCase: true).ToString())
            .ToList();
        var activeDaySet = activeDays.ToHashSet(
            StringComparer.OrdinalIgnoreCase);


        var upcomingSlots = await GetUpcomingSlotsAsync(id);
        var incompatibleSlot = upcomingSlots.Any(slot =>
            !activeDaySet.Contains(slot.SlotDate.DayOfWeek.ToString()) ||
            string.CompareOrdinal(slot.StartTime, request.OpenTime!) < 0 ||
            string.CompareOrdinal(slot.EndTime, request.CloseTime!) > 0);

        if (incompatibleSlot)
        {
            return StationErrors.ScheduleConflict;
        }

        var schedule = new OperationalSchedule
        {
            OpenTime = request.OpenTime!,
            CloseTime = request.CloseTime!,
            ActiveDays = activeDays
        };

        var updated = await stationRepository.UpdateScheduleAsync(id, schedule);
        if (updated is null)
        {
            return StationErrors.RemovedBeforeScheduleUpdate;
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

    // Activates a station.
    public async Task<Result<StationResponse>> ActivateAsync(string id)
    {

        if (!ObjectId.TryParse(id, out _))
        {
            return StationErrors.InvalidId;
        }

        var station = await stationRepository.FindByIdAsync(id);
        if (station is null)
        {
            return StationErrors.NotFound;
        }


        var activeStation = station.Status == StationStatus.Active
            ? station
            : await stationRepository.SetStatusAsync(id, StationStatus.Active);

        if (activeStation is null)
        {
            return StationErrors.RemovedBeforeActivation;
        }

        return new StationResponse(
            activeStation.Id,
            activeStation.StationName,
            activeStation.Location,
            activeStation.Latitude,
            activeStation.Longitude,
            activeStation.CapacityKwh,
            activeStation.BatterySlotCount,
            activeStation.Type.ToString(),
            new StationScheduleResponse(
                activeStation.OperationalSchedule.OpenTime,
                activeStation.OperationalSchedule.CloseTime,
                activeStation.OperationalSchedule.ActiveDays),
            activeStation.Status.ToString(),
            activeStation.CreatedAt,
            activeStation.UpdatedAt);
    }


    // Deactivates a station unless active reservations block it.
    public async Task<Result<StationResponse>> DeactivateAsync(string id)
    {
        // Validate the ID and find the station.
        if (!ObjectId.TryParse(id, out _))
        {
            return StationErrors.InvalidId;
        }

        var station = await stationRepository.FindByIdAsync(id);
        if (station is null)
        {
            return StationErrors.NotFound;
        }


        if (station.Status == StationStatus.Inactive)
        {
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

        var blockingReservations =
            await stationRepository.GetActiveReservationsAsync(id);

        if (blockingReservations.Count > 0)
        {

            var details = blockingReservations
                .Select(reservation =>
                    $"Reservation {reservation.Id}: {reservation.Status}, " +
                    $"{reservation.ReservationDate:yyyy-MM-dd} " +
                    $"{reservation.StartTime}-{reservation.EndTime}")
                .ToArray();

            return StationErrors.ActiveReservations(details);
        }

        var inactiveStation = await stationRepository.SetStatusAsync(
            id, StationStatus.Inactive);
        if (inactiveStation is null)
        {
            return StationErrors.RemovedBeforeDeactivation;
        }


        return new StationResponse(
            inactiveStation.Id,
            inactiveStation.StationName,
            inactiveStation.Location,
            inactiveStation.Latitude,
            inactiveStation.Longitude,
            inactiveStation.CapacityKwh,
            inactiveStation.BatterySlotCount,
            inactiveStation.Type.ToString(),
            new StationScheduleResponse(
                inactiveStation.OperationalSchedule.OpenTime,
                inactiveStation.OperationalSchedule.CloseTime,
                inactiveStation.OperationalSchedule.ActiveDays),
            inactiveStation.Status.ToString(),
            inactiveStation.CreatedAt,
            inactiveStation.UpdatedAt);
    }

    // Deletes a station only when no slots or reservations reference it.
    public async Task<Result> DeleteAsync(string id)
    {

        if (!ObjectId.TryParse(id, out _))
        {
            return StationErrors.InvalidId;
        }

        var station = await stationRepository.FindByIdAsync(id);
        if (station is null)
        {
            return StationErrors.NotFound;
        }


        var hasSlots = await stationRepository.HasAnySlotsAsync(id);
        var hasReservations =
            await stationRepository.HasAnyReservationsAsync(id);

        if (hasSlots || hasReservations)
        {
            var details = new List<string>();
            if (hasSlots)
            {
                details.Add("Booking slots reference this station.");
            }

            if (hasReservations)
            {
                details.Add("Reservations reference this station.");
            }

            return StationErrors.Dependencies(details.ToArray());
        }

        var deleted = await stationRepository.DeleteByIdAsync(id);
        if (!deleted)
        {
            return StationErrors.RemovedBeforeDeletion;
        }

        return Result.Success();
    }

    // Finds slots that have not ended using UTC dates and times.
    private async Task<List<EnergyBookingSlot>> GetUpcomingSlotsAsync(string id)
    {

        var utcNow = DateTime.UtcNow;
        var utcToday = utcNow.Date;
        var utcTime = utcNow.ToString("HH:mm", CultureInfo.InvariantCulture);

        return await stationRepository.GetUpcomingSlotsAsync(
            id, utcToday, utcTime);
    }


    // Calculates the great-circle distance between two GPS points.
    private static double DistanceKm(
        double fromLat, double fromLng,
        double toLat, double toLng)
    {

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
