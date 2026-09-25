/*
 * ReservationErrors.cs
 * Expected failures returned by ReservationService, following the Result
 * pattern described in README section 10.1.
 */

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
}
