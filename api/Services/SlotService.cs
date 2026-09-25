using MicrogridApi.Common;
using MicrogridApi.DTOs.Slots;
using MicrogridApi.Models;
using MicrogridApi.Repositories;

namespace MicrogridApi.Services;

public class SlotService(SlotRepository slotRepository, StationRepository stationRepository)
{
    // Slot duration is fixed at 1 hour per the current project decision.
    private static readonly TimeSpan SlotDuration = TimeSpan.FromHours(1);

    // Ensures every date is stored/compared as an unambiguous UTC midnight
    // value, regardless of how it arrived (JSON body deserialization gives
    // DateTime.Kind = Unspecified, which can be converted inconsistently
    // by the MongoDB driver if left as-is).
    private static DateTime NormalizeDate(DateTime date) =>
        DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);

    // ---------- Manual single-slot creation ----------

    public async Task<Result<SlotResponse>> CreateAsync(string stationId, CreateSlotRequest request)
    {
        var station = await stationRepository.FindByIdAsync(stationId);
        if (station is null)
        {
            return SlotErrors.StationNotFound;
        }

        var slotDate = NormalizeDate(request.SlotDate);

        var hasOverlap = await slotRepository.HasOverlapAsync(
            stationId, slotDate, request.StartTime, request.EndTime);
        if (hasOverlap)
        {
            return SlotErrors.SlotOverlap;
        }

        var slot = new EnergyBookingSlot
        {
            StationId = stationId,
            SlotDate = slotDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            CapacityKwh = request.CapacityKwh,
            IsAvailable = true,
            ReservedCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await slotRepository.CreateAsync(slot);
        return ToResponse(slot);
    }

    // ---------- Slot generation from station schedule (signature feature) ----------

    public async Task<Result<List<SlotResponse>>> GenerateAsync(string stationId, GenerateSlotsRequest request)
{
    var station = await stationRepository.FindByIdAsync(stationId);
    if (station is null)
    {
        return SlotErrors.StationNotFound;
    }

    var targetDate = NormalizeDate(request.Date);

    var dayName = targetDate.DayOfWeek.ToString();
    if (!station.OperationalSchedule.ActiveDays.Contains(dayName))
    {
        return SlotErrors.DayNotOperational;
    }

    var existing = await slotRepository.FindByStationAndDateAsync(stationId, targetDate);
    if (existing.Count > 0)
    {
        return SlotErrors.SlotsAlreadyGenerated;
    }

    var openTime = ParseTime(station.OperationalSchedule.OpenTime);
    var closeTime = ParseTime(station.OperationalSchedule.CloseTime);

    // Each slot's capacity is the station's total throughput divided evenly
    // across its physical battery bays, so no single hour can be booked for
    // more energy than the station can actually deliver across all its bays.
    var perSlotCapacity = station.BatterySlotCount > 0
        ? station.CapacityKwh / station.BatterySlotCount
        : station.CapacityKwh;

    var generatedSlots = new List<EnergyBookingSlot>();
    var current = openTime;

    while (current.Add(SlotDuration) <= closeTime)
    {
        var start = current;
        var end = current.Add(SlotDuration);

        generatedSlots.Add(new EnergyBookingSlot
        {
            StationId = stationId,
            SlotDate = targetDate,
            StartTime = FormatTime(start),
            EndTime = FormatTime(end),
            CapacityKwh = perSlotCapacity,
            IsAvailable = true,
            ReservedCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        current = end;
    }

    if (generatedSlots.Count == 0)
    {
        return SlotErrors.DayNotOperational;
    }

    await slotRepository.CreateManyAsync(generatedSlots);
    return generatedSlots.Select(ToResponse).ToList();
}

    // ---------- Reads ----------

    public async Task<List<SlotResponse>> GetByStationAsync(string stationId)
    {
        var slots = await slotRepository.FindByStationAsync(stationId);
        return slots.Select(ToResponse).ToList();
    }

    public async Task<List<SlotResponse>> GetAsync(DateTime? date, bool? available)
    {
        var slots = await slotRepository.FindAsync(date, available);
        return slots.Select(ToResponse).ToList();
    }

    // ---------- Update / availability / delete ----------

    public async Task<Result<SlotResponse>> UpdateAsync(string id, UpdateSlotRequest request)
    {
        var slot = await slotRepository.FindByIdAsync(id);
        if (slot is null)
        {
            return SlotErrors.SlotNotFound;
        }

        // BR-09: don't allow shrinking capacity below what's already reserved.
        if (slot.ReservedCount > 0 && request.CapacityKwh < slot.CapacityKwh)
        {
            return SlotErrors.SlotHasReservations;
        }

        var slotDate = NormalizeDate(request.SlotDate);

        var hasOverlap = await slotRepository.HasOverlapAsync(
            slot.StationId, slotDate, request.StartTime, request.EndTime, excludeId: id);
        if (hasOverlap)
        {
            return SlotErrors.SlotOverlap;
        }

        slot.SlotDate = slotDate;
        slot.StartTime = request.StartTime;
        slot.EndTime = request.EndTime;
        slot.CapacityKwh = request.CapacityKwh;
        slot.UpdatedAt = DateTime.UtcNow;

        await slotRepository.ReplaceAsync(slot);
        return ToResponse(slot);
    }

    public async Task<Result<SlotResponse>> SetAvailabilityAsync(string id, bool isAvailable)
    {
        var slot = await slotRepository.FindByIdAsync(id);
        if (slot is null)
        {
            return SlotErrors.SlotNotFound;
        }

        await slotRepository.UpdateAvailabilityAsync(id, isAvailable);
        slot.IsAvailable = isAvailable;
        return ToResponse(slot);
    }

    public Task SetBulkAvailabilityAsync(List<string> slotIds, bool isAvailable) =>
        slotRepository.UpdateManyAvailabilityAsync(slotIds, isAvailable);

    public async Task<Result> DeleteAsync(string id)
    {
        var slot = await slotRepository.FindByIdAsync(id);
        if (slot is null)
        {
            return SlotErrors.SlotNotFound;
        }

        // BR-09: cannot delete a slot that still has active reservations.
        if (slot.ReservedCount > 0)
        {
            return SlotErrors.SlotHasReservations;
        }

        await slotRepository.DeleteAsync(id);
        return Result.Success();
    }

    // ---------- Helpers ----------

    private static TimeSpan ParseTime(string time) => TimeSpan.Parse(time);

    private static string FormatTime(TimeSpan time) => time.ToString(@"hh\:mm");

    private static SlotResponse ToResponse(EnergyBookingSlot slot) => new(
        slot.Id,
        slot.StationId,
        slot.SlotDate,
        slot.StartTime,
        slot.EndTime,
        slot.CapacityKwh,
        slot.IsAvailable,
        slot.ReservedCount);
}