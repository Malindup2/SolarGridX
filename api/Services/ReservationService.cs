using System.Globalization;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;
using MicrogridApi.Repositories;

namespace MicrogridApi.Services;

public class ReservationService(
    ReservationRepository reservationRepository,
    SlotRepository slotRepository,
    StationRepository stationRepository,
    UserRepository userRepository,
    QrIssueService qrIssueService,
    ActivityService activityService)
{
    
    private const int BookingWindowDays = 7;

    // BR-02 and BR-03: changes need at least this many hours' notice.
    private const int MinimumNoticeHours = 12;

    // Creates a Pending reservation against an available slot.
    public async Task<Result<ReservationResponse>> CreateAsync(
        CreateReservationRequest request, string? callerNic, string? callerRole)
    {
        
        if (!ObjectIds.IsValid(request.StationId))
        {
            return ObjectIds.Invalid("stationId");
        }

        if (!ObjectIds.IsValid(request.SlotId))
        {
            return ObjectIds.Invalid("slotId");
        }

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

        var windowError = ValidateBookingWindow(slot.SlotDate, slot.StartTime);
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

        // BR-31: no two live bookings that overlap in time, whatever slot they use.
        if (await reservationRepository.ExistsOverlappingAsync(request.Nic, slot.SlotDate, slot.StartTime, slot.EndTime))
        {
            return ReservationErrors.Overlap;
        }

        // BR-13: take the bay first, in one atomic step, so the last bay can never be sold twice.
        if (!await slotRepository.TryReserveAsync(slot.Id, station.BatterySlotCount))
        {
            return slot.IsAvailable ? ReservationErrors.SlotFull : ReservationErrors.SlotUnavailable;
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

        try
        {
            await reservationRepository.CreateAsync(reservation);
        }
        catch
        {
            // The bay was already taken: give it back so a failed insert cannot leak capacity.
            await slotRepository.AdjustReservedCountAsync(slot.Id, -1);
            throw;
        }

        await RecordAsync(reservation, "ReservationCreated",
            $"New reservation at {station.StationName} for {Describe(reservation)}.",
            Recipients.ForProsumer(reservation.Nic).And(Recipients.ForRole(Role.GridOperator)));

        return ToResponse(reservation, station.StationName);
    }

    // A prosumer may only act on their own NIC
    // Changes the energy booked on a Pending reservation. BR-02 applies.
    public async Task<Result<ReservationResponse>> UpdateAsync(
        string id, UpdateReservationRequest request, string? callerNic, string? callerRole)
    {
        var loaded = await LoadModifiableAsync(id, callerNic, callerRole, request.ExpectedUpdatedAt);
        if (loaded.Error is not null)
        {
            return loaded.Error;
        }

        var reservation = loaded.Reservation!;

        var slot = await slotRepository.FindByIdAsync(reservation.SlotId);
        if (slot is null)
        {
            return ReservationErrors.SlotNotFound;
        }

        if (request.EnergyKwh > slot.CapacityKwh)
        {
            return ReservationErrors.EnergyExceedsSlotCapacity(request.EnergyKwh, slot.CapacityKwh);
        }

        var loadedAt = reservation.UpdatedAt;
        var wasApproved = BackToPending(reservation);
        reservation.EnergyKwh = request.EnergyKwh;
        reservation.UpdatedAt = DateTime.UtcNow;
        if (!await reservationRepository.ReplaceIfUnchangedAsync(reservation, loadedAt))
        {
            return ReservationErrors.Changed;
        }

        var station = await stationRepository.FindByIdAsync(reservation.StationId);

        await RecordAsync(reservation, "ReservationUpdated",
            wasApproved
                ? $"Reservation updated and sent back for approval: {Describe(reservation)}."
                : $"Reservation updated: {Describe(reservation)}.",
            Recipients.ForProsumer(reservation.Nic).And(Recipients.ForRole(Role.GridOperator)));

        return ToResponse(reservation, station?.StationName ?? string.Empty);
    }

    // Moves a Pending reservation onto a different slot. BR-01 and BR-02 apply.
    public async Task<Result<ReservationResponse>> RescheduleAsync(
        string id, RescheduleReservationRequest request, string? callerNic, string? callerRole)
    {
        var loaded = await LoadModifiableAsync(id, callerNic, callerRole, request.ExpectedUpdatedAt);
        if (loaded.Error is not null)
        {
            return loaded.Error;
        }

        var reservation = loaded.Reservation!;

        if (!ObjectIds.IsValid(request.SlotId))
        {
            return ObjectIds.Invalid("slotId");
        }

        if (reservation.SlotId == request.SlotId)
        {
            return ReservationErrors.SameSlot;
        }

        var slot = await slotRepository.FindByIdAsync(request.SlotId);
        if (slot is null)
        {
            return ReservationErrors.SlotNotFound;
        }

        if (!slot.IsAvailable)
        {
            return ReservationErrors.SlotUnavailable;
        }

        var station = await stationRepository.FindByIdAsync(slot.StationId);
        if (station is null)
        {
            return ReservationErrors.StationNotFound;
        }

        if (station.Status != StationStatus.Active)
        {
            return ReservationErrors.StationInactive;
        }

        // The new slot must satisfy both the booking window and the notice rule.
        var windowError = ValidateBookingWindow(slot.SlotDate, slot.StartTime);
        if (windowError is not null)
        {
            return windowError;
        }

        var noticeError = ValidateNotice(slot.SlotDate, slot.StartTime);
        if (noticeError is not null)
        {
            return noticeError;
        }

        if (reservation.EnergyKwh > slot.CapacityKwh)
        {
            return ReservationErrors.EnergyExceedsSlotCapacity(reservation.EnergyKwh, slot.CapacityKwh);
        }

        if (station.BatterySlotCount > 0 && slot.ReservedCount >= station.BatterySlotCount)
        {
            return ReservationErrors.SlotFull;
        }

        if (await reservationRepository.ExistsLiveForSlotAsync(reservation.Nic, slot.Id))
        {
            return ReservationErrors.AlreadyReserved(reservation.Nic);
        }

        if (await reservationRepository.ExistsOverlappingAsync(
                reservation.Nic, slot.SlotDate, slot.StartTime, slot.EndTime, excludeReservationId: reservation.Id))
        {
            return ReservationErrors.Overlap;
        }

        // Take the new bay atomically before anything is saved.
        if (!await slotRepository.TryReserveAsync(slot.Id, station.BatterySlotCount))
        {
            return ReservationErrors.SlotFull;
        }

        var previousSlotId = reservation.SlotId;
        var loadedAt = reservation.UpdatedAt;
        var wasApproved = BackToPending(reservation);

        reservation.SlotId = slot.Id;
        reservation.StationId = slot.StationId;
        reservation.ReservationDate = slot.SlotDate;
        reservation.StartTime = slot.StartTime;
        reservation.EndTime = slot.EndTime;
        reservation.UpdatedAt = DateTime.UtcNow;

        if (!await reservationRepository.ReplaceIfUnchangedAsync(reservation, loadedAt))
        {
            await slotRepository.AdjustReservedCountAsync(slot.Id, -1);
            return ReservationErrors.Changed;
        }

        await slotRepository.AdjustReservedCountAsync(previousSlotId, -1);

        await RecordAsync(reservation, "ReservationRescheduled",
            wasApproved
                ? $"Reservation moved to {station.StationName} on {Describe(reservation)} and sent back for approval."
                : $"Reservation moved to {station.StationName} on {Describe(reservation)}.",
            Recipients.ForProsumer(reservation.Nic).And(Recipients.ForRole(Role.GridOperator)));

        return ToResponse(reservation, station.StationName);
    }

    // Grid Operator approves a Pending reservation. BR-07 then allows the QR
    // token to be issued, which happens here so the prosumer can fetch it
    // straight away.
    public async Task<Result<ReservationResponse>> ApproveAsync(string id, string? approvedBy)
    {
        if (!ObjectIds.IsValid(id))
        {
            return ReservationErrors.NotFound;
        }

        var reservation = await reservationRepository.FindByIdAsync(id);
        if (reservation is null)
        {
            return ReservationErrors.NotFound;
        }

        if (reservation.Status != ReservationStatus.Pending)
        {
            return ReservationErrors.AlreadyDecided(reservation.Status.ToString());
        }

        // BR-32: approving a booking whose slot has already started would issue a code for the past.
        if (ReservationViewService.StartsAt(reservation) <= BusinessClock.Now)
        {
            return ReservationErrors.AlreadyStarted;
        }

        var loadedAt = reservation.UpdatedAt;
        reservation.Status = ReservationStatus.Approved;
        reservation.ApprovedBy = approvedBy;
        reservation.RejectionReason = null;
        reservation.UpdatedAt = DateTime.UtcNow;
        if (!await reservationRepository.ReplaceIfUnchangedAsync(reservation, loadedAt))
        {
            // Someone cancelled, rejected or edited it while we were deciding.
            return ReservationErrors.Changed;
        }

        var issued = await qrIssueService.IssueAsync(reservation.Id);
        if (!issued.IsSuccess)
        {
            // Put the reservation back so it is never left approved without a token.
            reservation.Status = ReservationStatus.Pending;
            reservation.ApprovedBy = null;
            reservation.UpdatedAt = DateTime.UtcNow;
            await reservationRepository.ReplaceAsync(reservation);

            return issued.Error!;
        }

        var approvedStation = await stationRepository.FindByIdAsync(reservation.StationId);

        await RecordAsync(reservation, "ReservationApproved",
            $"Your reservation at {approvedStation?.StationName} for {Describe(reservation)} was approved. Your QR code is ready.",
            Recipients.ForProsumer(reservation.Nic));

        return ToResponse(reservation, approvedStation?.StationName ?? string.Empty);
    }

    // Grid Operator rejects a Pending reservation and frees the slot again.
    public async Task<Result<ReservationResponse>> RejectAsync(
        string id, RejectReservationRequest request, string? rejectedBy)
    {
        if (!ObjectIds.IsValid(id))
        {
            return ReservationErrors.NotFound;
        }

        var reservation = await reservationRepository.FindByIdAsync(id);
        if (reservation is null)
        {
            return ReservationErrors.NotFound;
        }

        if (reservation.Status != ReservationStatus.Pending)
        {
            return ReservationErrors.AlreadyDecided(reservation.Status.ToString());
        }

        var loadedAt = reservation.UpdatedAt;
        reservation.Status = ReservationStatus.Rejected;
        reservation.RejectionReason = request.Reason;
        reservation.ApprovedBy = rejectedBy;
        reservation.UpdatedAt = DateTime.UtcNow;

        if (!await reservationRepository.ReplaceIfUnchangedAsync(reservation, loadedAt))
        {
            return ReservationErrors.Changed;
        }

        await slotRepository.AdjustReservedCountAsync(reservation.SlotId, -1);

        var station = await stationRepository.FindByIdAsync(reservation.StationId);

        await RecordAsync(reservation, "ReservationRejected",
            $"Your reservation at {station?.StationName} for {Describe(reservation)} was rejected: {request.Reason}",
            Recipients.ForProsumer(reservation.Nic));

        return ToResponse(reservation, station?.StationName ?? string.Empty);
    }

    // Cancels a Pending or Approved reservation and releases its slot. BR-03
    // applies. A Backoffice officer may cancel on a prosumer's behalf.
    public async Task<Result<ReservationResponse>> CancelAsync(
        string id, string? callerNic, string? callerRole)
    {
        if (!ObjectIds.IsValid(id))
        {
            return ReservationErrors.NotFound;
        }

        var reservation = await reservationRepository.FindByIdAsync(id);
        if (reservation is null)
        {
            return ReservationErrors.NotFound;
        }

        if (!IsOwnRecord(callerRole, callerNic, reservation.Nic))
        {
            return ReservationErrors.NotOwner;
        }

        if (reservation.Status is not (ReservationStatus.Pending or ReservationStatus.Approved))
        {
            return ReservationErrors.NotCancellable(reservation.Status.ToString());
        }

        var noticeError = ValidateNotice(reservation.ReservationDate, reservation.StartTime);
        if (noticeError is not null)
        {
            return noticeError;
        }

        var loadedAt = reservation.UpdatedAt;
        reservation.Status = ReservationStatus.Cancelled;
        reservation.UpdatedAt = DateTime.UtcNow;

        if (!await reservationRepository.ReplaceIfUnchangedAsync(reservation, loadedAt))
        {
            return ReservationErrors.Changed;
        }

        await slotRepository.AdjustReservedCountAsync(reservation.SlotId, -1);

        var station = await stationRepository.FindByIdAsync(reservation.StationId);

        await RecordAsync(reservation, "ReservationCancelled",
            $"Reservation at {station?.StationName} for {Describe(reservation)} was cancelled.",
            Recipients.ForProsumer(reservation.Nic).And(Recipients.ForRole(Role.GridOperator)));

        return ToResponse(reservation, station?.StationName ?? string.Empty);
    }

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

        if (stationId is not null && !ObjectIds.IsValid(stationId))
        {
            return ObjectIds.Invalid("stationId");
        }

        var effectiveNic = callerRole == RoleNames.Prosumer ? callerNic : nic;
        var reservations = await reservationRepository.FindAsync(effectiveNic, parsedStatus, stationId);
        var stationNames = await StationNamesAsync();

        return reservations
            .Select(r => ToResponse(r, stationNames.GetValueOrDefault(r.StationId, string.Empty)))
            .ToList();
    }

    // Booking monitor: the list filters plus a date range.
    public async Task<Result<List<ReservationResponse>>> SearchAsync(
        string? nic, string? status, string? stationId, DateTime? dateFrom, DateTime? dateTo,
        string? callerNic, string? callerRole)
    {
        var parsed = ParseStatus(status);
        if (parsed.Error is not null)
        {
            return parsed.Error;
        }

        if (stationId is not null && !ObjectIds.IsValid(stationId))
        {
            return ObjectIds.Invalid("stationId");
        }

        var effectiveNic = callerRole == RoleNames.Prosumer ? callerNic : nic;
        var reservations = await reservationRepository.SearchAsync(
            effectiveNic, parsed.Status, stationId, dateFrom, dateTo);

        var stationNames = await StationNamesAsync();

        return reservations
            .Select(r => ToResponse(r, stationNames.GetValueOrDefault(r.StationId, string.Empty)))
            .ToList();
    }

    // Pre-flight check so a client can test a slot before committing to it.
    public async Task<Result<ReservationValidationResponse>> ValidateAsync(
        string slotId, string? callerNic, string? callerRole)
    {
        if (!ObjectIds.IsValid(slotId))
        {
            return ObjectIds.Invalid("slotId");
        }

        var slot = await slotRepository.FindByIdAsync(slotId);
        if (slot is null)
        {
            return ReservationErrors.SlotNotFound;
        }

        var failure = await FirstBookingFailureAsync(slot, callerNic, callerRole);

        return failure is null
            ? new ReservationValidationResponse(true, null, null)
            : new ReservationValidationResponse(false, failure.Code, failure.Message);
    }

    // Runs the create-time checks that do not depend on the energy amount.
    private async Task<Error?> FirstBookingFailureAsync(
        Models.EnergyBookingSlot slot, string? callerNic, string? callerRole)
    {
        if (callerRole == RoleNames.Prosumer)
        {
            if (string.IsNullOrWhiteSpace(callerNic))
            {
                return ReservationErrors.NotOwner;
            }

            var prosumer = await userRepository.FindProsumerByNicAsync(callerNic);
            if (prosumer is null)
            {
                return ReservationErrors.ProsumerNotFound;
            }

            if (prosumer.Status != UserStatus.Active)
            {
                return ReservationErrors.ProsumerNotActive(prosumer.Status.ToString());
            }

            if (await reservationRepository.ExistsLiveForSlotAsync(callerNic, slot.Id))
            {
                return ReservationErrors.AlreadyReserved(callerNic);
            }
        }

        if (!slot.IsAvailable)
        {
            return ReservationErrors.SlotUnavailable;
        }

        var station = await stationRepository.FindByIdAsync(slot.StationId);
        if (station is null)
        {
            return ReservationErrors.StationNotFound;
        }

        if (station.Status != StationStatus.Active)
        {
            return ReservationErrors.StationInactive;
        }

        if (station.BatterySlotCount > 0 && slot.ReservedCount >= station.BatterySlotCount)
        {
            return ReservationErrors.SlotFull;
        }

        return ValidateBookingWindow(slot.SlotDate, slot.StartTime);
    }

    private static (ReservationStatus? Status, Error? Error) ParseStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return (null, null);
        }

        if (!Enum.TryParse<ReservationStatus>(status, ignoreCase: true, out var value) || !Enum.IsDefined(value))
        {
            return (null, Error.Validation(
                "VALIDATION_FAILED",
                "One or more validation errors occurred.",
                [$"status: '{status}' is not a known reservation status."]));
        }

        return (value, null);
    }

    // Returns one reservation, refusing a prosumer who asks for another's.
    public async Task<Result<ReservationResponse>> GetByIdAsync(
        string id, string? callerNic, string? callerRole)
    {
        if (!ObjectIds.IsValid(id))
        {
            return ReservationErrors.NotFound;
        }

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

    // Shared guard for the change endpoints: the reservation must exist, belong
    // to the caller, still be Pending, and leave enough notice (BR-02).
    private async Task<(EnergyReservation? Reservation, Error? Error)> LoadModifiableAsync(
        string id, string? callerNic, string? callerRole, DateTime? expectedUpdatedAt = null)
    {
        if (!ObjectIds.IsValid(id))
        {
            return (null, ReservationErrors.NotFound);
        }

        var reservation = await reservationRepository.FindByIdAsync(id);
        if (reservation is null)
        {
            return (null, ReservationErrors.NotFound);
        }

        if (!IsOwnRecord(callerRole, callerNic, reservation.Nic))
        {
            return (null, ReservationErrors.NotOwner);
        }

        // BR-16: Pending and Approved bookings can be changed; an approved one goes back to Pending.
        if (reservation.Status is not (ReservationStatus.Pending or ReservationStatus.Approved))
        {
            return (null, ReservationErrors.NotModifiable(reservation.Status.ToString()));
        }

        if (Versioning.IsStale(expectedUpdatedAt, reservation.UpdatedAt))
        {
            return (null, ReservationErrors.Changed);
        }

        var noticeError = ValidateNotice(reservation.ReservationDate, reservation.StartTime);
        return noticeError is not null ? (null, noticeError) : (reservation, null);
    }

    // BR-02 and BR-03: at least 12 hours before the slot starts.
    private static Error? ValidateNotice(DateTime reservationDate, string startTime)
    {
        var hoursRemaining = (CombineDateAndTime(reservationDate, startTime) - BusinessClock.Now).TotalHours;

        return hoursRemaining < MinimumNoticeHours
            ? ReservationErrors.NoticeTooShort(hoursRemaining)
            : null;
    }

    // Slot times are stored as "HH:mm" Sri Lanka time against the slot date.
    private static DateTime CombineDateAndTime(DateTime date, string time)
    {
        var parts = time.Split(':');
        var hour = int.Parse(parts[0], CultureInfo.InvariantCulture);
        var minute = int.Parse(parts[1], CultureInfo.InvariantCulture);

        return new DateTime(date.Year, date.Month, date.Day, hour, minute, 0, DateTimeKind.Unspecified);
    }

    private static bool IsOwnRecord(string? callerRole, string? callerNic, string recordNic) =>
        callerRole != RoleNames.Prosumer ||
        string.Equals(callerNic, recordNic, StringComparison.OrdinalIgnoreCase);

    // slot must be today or later, and no more than 7 days ahead.
    private static Error? ValidateBookingWindow(DateTime slotDate, string startTime)
    {
        var daysAhead = (slotDate.Date - BusinessClock.Today).Days;

        if (daysAhead < 0)
        {
            return ReservationErrors.DateInPast;
        }

        if (daysAhead > BookingWindowDays)
        {
            return ReservationErrors.WindowExceeded(slotDate, daysAhead);
        }

        // BR-37: a started slot could never be approved (BR-32), so it cannot be booked either.
        return CombineDateAndTime(slotDate, startTime) <= BusinessClock.Now
            ? ReservationErrors.SlotAlreadyStarted
            : null;
    }

    
    // An approved booking that is changed needs approving again, and its old QR code must die.
    // Returns true when it was Approved (so the notification can say so).
    private static bool BackToPending(EnergyReservation reservation)
    {
        if (reservation.Status != ReservationStatus.Approved)
        {
            return false;
        }

        reservation.Status = ReservationStatus.Pending;
        reservation.QrToken = null;
        reservation.ApprovedBy = null;
        return true;
    }

    private Task RecordAsync(EnergyReservation reservation, string @event, string message, Recipients recipients) =>
        activityService.RecordAsync(
            AuditKinds.Reservations, reservation.Id, @event, message,
            NotificationCategory.Reservation, ActivityActions.Reservation, recipients);

    // "Sat 3 Oct 09:00-10:00, 12.5 kWh"
    private static string Describe(EnergyReservation reservation) =>
        $"{reservation.ReservationDate:ddd d MMM} {reservation.StartTime}-{reservation.EndTime}, {reservation.EnergyKwh} kWh";

    private static ReservationResponse ToResponse(EnergyReservation reservation, string stationName) =>
        ReservationMapper.ToResponse(reservation, stationName);
}
