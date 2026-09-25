using MicrogridApi.Common;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;
using MicrogridApi.Repositories;

namespace MicrogridApi.Services;

public class ReservationService(
    ReservationRepository reservationRepository,
    SlotRepository slotRepository,
    StationRepository stationRepository,
    UserRepository userRepository)
{
    
    private const int BookingWindowDays = 7;

    // Creates a Pending reservation against an available slot.
    public async Task<Result<ReservationResponse>> CreateAsync(
        CreateReservationRequest request, string? callerNic, string? callerRole)
    {
        
        if (!IsOwnRecord(callerRole, callerNic, request.Nic))
        {
            return ReservationErrors.NotOwner;
        }

        var prosumer = await userRepository.FindProsumerByNicAsync(request.Nic);
        if (prosumer is null)
        {
            return ReservationErrors.ProsumerNotFound;
        }

        // BR-10: only Active prosumers may create reservations.
        if (prosumer.Status != UserStatus.Active)
        {
            return ReservationErrors.ProsumerNotActive(prosumer.Status.ToString());
        }

        var slot = await slotRepository.FindByIdAsync(request.SlotId);
        if (slot is null)
        {
            return ReservationErrors.SlotNotFound;
        }

        if (slot.StationId != request.StationId)
        {
            return ReservationErrors.SlotStationMismatch;
        }

        
        if (slot.SlotDate.Date != request.ReservationDate.Date ||
            slot.StartTime != request.StartTime ||
            slot.EndTime != request.EndTime)
        {
            return ReservationErrors.SlotScheduleMismatch(
                $"{slot.SlotDate:yyyy-MM-dd} {slot.StartTime}-{slot.EndTime}");
        }

        if (!slot.IsAvailable)
        {
            return ReservationErrors.SlotUnavailable;
        }

        var station = await stationRepository.FindByIdAsync(request.StationId);
        if (station is null)
        {
            return ReservationErrors.StationNotFound;
        }

        if (station.Status != StationStatus.Active)
        {
            return ReservationErrors.StationInactive;
        }

        var windowError = ValidateBookingWindow(slot.SlotDate);
        if (windowError is not null)
        {
            return windowError;
        }

        if (request.EnergyKwh > slot.CapacityKwh)
        {
            return ReservationErrors.EnergyExceedsSlotCapacity(request.EnergyKwh, slot.CapacityKwh);
        }

        // One reservation per battery bay at the node.
        if (station.BatterySlotCount > 0 && slot.ReservedCount >= station.BatterySlotCount)
        {
            return ReservationErrors.SlotFull;
        }

        if (await reservationRepository.ExistsLiveForSlotAsync(request.Nic, request.SlotId))
        {
            return ReservationErrors.AlreadyReserved(request.Nic);
        }

        var reservation = new EnergyReservation
        {
            Nic = request.Nic,
            StationId = slot.StationId,
            SlotId = slot.Id,
            ReservationDate = slot.SlotDate,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            EnergyKwh = request.EnergyKwh,
            Status = ReservationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await reservationRepository.CreateAsync(reservation);
        await slotRepository.AdjustReservedCountAsync(slot.Id, 1);

        return ToResponse(reservation, station.StationName);
    }

    // A prosumer may only act on their own NIC
    // Lists reservations. A prosumer only ever sees their own, whatever the
    // query string asks for.
    public async Task<Result<List<ReservationResponse>>> ListAsync(
        string? nic, string? status, string? stationId, string? callerNic, string? callerRole)
    {
        ReservationStatus? parsedStatus = null;

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ReservationStatus>(status, ignoreCase: true, out var value)
                || !Enum.IsDefined(value))
            {
                return Error.Validation(
                    "VALIDATION_FAILED",
                    "One or more validation errors occurred.",
                    [$"status: '{status}' is not a known reservation status."]);
            }

            parsedStatus = value;
        }

        var effectiveNic = callerRole == RoleNames.Prosumer ? callerNic : nic;
        var reservations = await reservationRepository.FindAsync(effectiveNic, parsedStatus, stationId);
        var stationNames = await StationNamesAsync();

        return reservations
            .Select(r => ToResponse(r, stationNames.GetValueOrDefault(r.StationId, string.Empty)))
            .ToList();
    }

    // Returns one reservation, refusing a prosumer who asks for another's.
    public async Task<Result<ReservationResponse>> GetByIdAsync(
        string id, string? callerNic, string? callerRole)
    {
        var reservation = await reservationRepository.FindByIdAsync(id);
        if (reservation is null)
        {
            return ReservationErrors.NotFound;
        }

        if (!IsOwnRecord(callerRole, callerNic, reservation.Nic))
        {
            return ReservationErrors.NotOwner;
        }

        var station = await stationRepository.FindByIdAsync(reservation.StationId);
        return ToResponse(reservation, station?.StationName ?? string.Empty);
    }

    private async Task<Dictionary<string, string>> StationNamesAsync()
    {
        var stations = await stationRepository.GetAllAsync();
        return stations.ToDictionary(s => s.Id, s => s.StationName);
    }

    private static bool IsOwnRecord(string? callerRole, string? callerNic, string recordNic) =>
        callerRole != RoleNames.Prosumer ||
        string.Equals(callerNic, recordNic, StringComparison.OrdinalIgnoreCase);

    // slot must be today or later, and no more than 7 days ahead.
    private static Error? ValidateBookingWindow(DateTime slotDate)
    {
        var daysAhead = (slotDate.Date - DateTime.UtcNow.Date).Days;

        if (daysAhead < 0)
        {
            return ReservationErrors.DateInPast;
        }

        return daysAhead > BookingWindowDays
            ? ReservationErrors.WindowExceeded(slotDate, daysAhead)
            : null;
    }

    
    private static ReservationResponse ToResponse(EnergyReservation reservation, string stationName) => new(
        reservation.Id,
        reservation.Nic,
        reservation.StationId,
        stationName,
        reservation.SlotId,
        reservation.ReservationDate,
        reservation.StartTime,
        reservation.EndTime,
        $"{reservation.ReservationDate:yyyy-MM-dd} {reservation.StartTime}-{reservation.EndTime}",
        reservation.EnergyKwh,
        reservation.Status.ToString(),
        reservation.Status == ReservationStatus.Approved,
        reservation.ApprovedBy,
        reservation.RejectionReason,
        reservation.CompletedAt,
        reservation.CreatedAt,
        reservation.UpdatedAt);
}
