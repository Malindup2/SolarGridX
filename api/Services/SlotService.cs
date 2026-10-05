using MicrogridApi.Common;
using MicrogridApi.DTOs.Slots;
using MicrogridApi.Models;
using MicrogridApi.Repositories;

namespace MicrogridApi.Services;

public class SlotService(SlotRepository slotRepository, StationRepository stationRepository, ActivityService activityService)
{
    // Slot duration is fixed at 1 hour per the current project decision.
    private static readonly TimeSpan SlotDuration = TimeSpan.FromHours(1);

    
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

        await activityService.RecordAsync(
            AuditKinds.Slots, slot.Id, "SlotCreated", $"Slot {slot.SlotDate:yyyy-MM-dd} {slot.StartTime}-{slot.EndTime} created.",
            NotificationCategory.Catalog, ActivityActions.Station, resourceId: slot.StationId);

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
        var now = BusinessClock.Now;
        var today = now.Date;
        var currentTime = now.TimeOfDay;

        // Reject dates before today (Sri Lanka time).
        if (targetDate < today)
        {
            return SlotErrors.PastDateNotAllowed;
        }

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

        // The hours of this weekday: a per-day override if the station has one, else its default hours.
        var (dayOpen, dayClose) = station.OperationalSchedule.HoursFor(dayName);
        var openTime = ParseTime(dayOpen);
        var closeTime = ParseTime(dayClose);
        var isToday = targetDate == today;

        var generatedSlots = new List<EnergyBookingSlot>();
        var current = openTime;

        while (current.Add(SlotDuration) <= closeTime)
        {
            var start = current;
            var end = current.Add(SlotDuration);

            // For today only: skip any slot whose start time has already
            // passed, so operators can't generate slots that would never be
            // bookable (e.g. generating at 12:00 shouldn't produce a
            // 09:00–10:00 slot).
            if (!isToday || start > currentTime)
            {
                generatedSlots.Add(new EnergyBookingSlot
                {
                    StationId = stationId,
                    SlotDate = targetDate,
                    StartTime = FormatTime(start),
                    EndTime = FormatTime(end),
                    CapacityKwh = station.BatterySlotCount > 0
                        ? station.CapacityKwh / station.BatterySlotCount
                        : station.CapacityKwh,
                    IsAvailable = true,
                    ReservedCount = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            current = end;
        }

        if (generatedSlots.Count == 0)
        {
            // Distinguish "station doesn't operate long enough for even one
            // slot" from "today's remaining hours have already passed" so
            // the operator gets an accurate, actionable message.
            return isToday ? SlotErrors.NoRemainingSlotsToday : SlotErrors.DayNotOperational;
        }

        await slotRepository.CreateManyAsync(generatedSlots);

        await activityService.RecordAsync(
            AuditKinds.Stations, stationId, "SlotsGenerated",
            $"{generatedSlots.Count} slots generated for {station.StationName}.",
            NotificationCategory.Catalog, ActivityActions.Station);

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

        if (Versioning.IsStale(request.ExpectedUpdatedAt, slot.UpdatedAt))
        {
            return SlotErrors.Changed;
        }

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

        await activityService.RecordAsync(
            AuditKinds.Slots, slot.Id, "SlotUpdated", $"Slot {slot.SlotDate:yyyy-MM-dd} {slot.StartTime}-{slot.EndTime} updated.",
            NotificationCategory.Catalog, ActivityActions.Station, resourceId: slot.StationId);

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

        await activityService.RecordAsync(
            AuditKinds.Slots, slot.Id, isAvailable ? "SlotOnline" : "SlotOffline", $"Slot {slot.SlotDate:yyyy-MM-dd} {slot.StartTime}-{slot.EndTime} is now {(isAvailable ? "online" : "offline")}.",
            NotificationCategory.Catalog, ActivityActions.Station, resourceId: slot.StationId);

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

        if (slot.ReservedCount > 0)
        {
            return SlotErrors.SlotHasReservations;
        }

        await slotRepository.DeleteAsync(id);

        await activityService.RecordAsync(
            AuditKinds.Slots, slot.Id, "SlotDeleted", $"Slot {slot.SlotDate:yyyy-MM-dd} {slot.StartTime}-{slot.EndTime} deleted.",
            NotificationCategory.Catalog, ActivityActions.Station, resourceId: slot.StationId);

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
        slot.ReservedCount,
        slot.UpdatedAt);
}