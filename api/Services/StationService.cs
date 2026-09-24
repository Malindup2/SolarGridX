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

namespace MicrogridApi.Services;

public sealed class StationService(
    StationRepository stationRepository,
    IValidator<CreateStationRequest> createValidator)
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
}