using MicrogridApi.Common;

namespace MicrogridApi.Services;

public static class ReservationErrors
{
    public static readonly Error NotFound =
        Error.NotFound("RESERVATION_NOT_FOUND", "No reservation was found with the given id.");

    public static readonly Error ProsumerNotFound =
        Error.NotFound("PROSUMER_NOT_FOUND", "No prosumer account was found for the given NIC.");

    // BR-10: only Active prosumers may create reservations.
    public static Error ProsumerNotActive(string status) =>
        Error.Forbidden(
            "PROSUMER_NOT_ACTIVE",
            $"This prosumer account is {status}. Only active accounts can reserve energy transfers.");

    public static readonly Error NotOwner =
        Error.Forbidden("NOT_RESERVATION_OWNER", "This reservation belongs to another prosumer.");

    public static readonly Error SlotNotFound =
        Error.NotFound("SLOT_NOT_FOUND", "No booking slot was found with the given id.");

    public static readonly Error SlotStationMismatch =
        Error.Validation("SLOT_STATION_MISMATCH", "The slot does not belong to the given station.");

    public static Error SlotScheduleMismatch(string slotTime) =>
        Error.Validation(
            "SLOT_SCHEDULE_MISMATCH",
            "The requested date and time do not match the chosen slot.",
            [$"slotId: this slot runs {slotTime}"]);

    public static readonly Error SlotUnavailable =
        Error.Conflict("SLOT_UNAVAILABLE", "This slot has been taken offline and cannot be reserved.");

    public static readonly Error SlotFull =
        Error.Conflict("SLOT_FULL", "Every battery bay in this slot is already reserved.");

    public static Error AlreadyReserved(string nic) =>
        Error.Conflict("SLOT_ALREADY_RESERVED", $"NIC {nic} already holds a reservation for this slot.");

    public static readonly Error StationNotFound =
        Error.NotFound("STATION_NOT_FOUND", "No microgrid node was found with the given id.");

    public static readonly Error StationInactive =
        Error.Conflict("STATION_INACTIVE", "This microgrid node is not currently operating.");

    public static Error EnergyExceedsSlotCapacity(double requested, double capacity) =>
        Error.Validation(
            "ENERGY_EXCEEDS_SLOT_CAPACITY",
            "The requested energy is greater than the slot can deliver.",
            [$"energyKwh: {requested} exceeds the slot capacity of {capacity}"]);

    public static readonly Error DateInPast =
        Error.Validation("RESERVATION_DATE_IN_PAST", "The chosen slot is in the past.");

    // BR-01: a reservation must fall within 7 days of the current date.
    public static Error WindowExceeded(DateTime reservationDate, int daysAhead) =>
        Error.Validation(
            "RESERVATION_WINDOW_EXCEEDED",
            "Reservations must be scheduled within 7 days.",
            [$"reservationDate: {reservationDate:yyyy-MM-dd} is {daysAhead} days from today"]);

    // BR-02 and BR-03: changes need at least 12 hours' notice.
    public static Error NoticeTooShort(double hoursRemaining) =>
        Error.Validation(
            "RESERVATION_NOTICE_TOO_SHORT",
            "Changes require at least 12 hours' notice before the slot starts.",
            [$"startTime: the slot starts in {hoursRemaining:0.#} hours"]);

    public static Error NotModifiable(string status) =>
        Error.Conflict("RESERVATION_NOT_MODIFIABLE", $"A {status} reservation can no longer be changed.");

    public static Error NotCancellable(string status) =>
        Error.Conflict("RESERVATION_NOT_CANCELLABLE", $"A {status} reservation can no longer be cancelled.");

    public static Error AlreadyDecided(string status) =>
        Error.Conflict("RESERVATION_ALREADY_DECIDED", $"This reservation is already {status}.");

    // BR-31: a prosumer cannot hold two live bookings that overlap in time, even in different slots.
    public static readonly Error Overlap =
        Error.Conflict("RESERVATION_OVERLAP", "This prosumer already has a booking that overlaps this time.");

    // BR-32: a booking cannot be approved once its slot has started.
    public static readonly Error AlreadyStarted =
        Error.Conflict("RESERVATION_ALREADY_STARTED", "This reservation's slot has already started and can no longer be approved. Reject it instead.");

    // Someone else changed the record between the user opening it and saving. Reload and retry.
    public static readonly Error Changed =
        Error.Conflict("RESERVATION_CHANGED", "This reservation was changed by someone else. Reload it and try again.");

    public static readonly Error SameSlot =
        Error.Validation("RESERVATION_SAME_SLOT", "The reservation already uses this slot.");
}
