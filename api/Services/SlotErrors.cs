using MicrogridApi.Common;

namespace MicrogridApi.Services;

public static class SlotErrors
{
    public static readonly Error StationNotFound =
        Error.NotFound("STATION_NOT_FOUND", "No station was found with the given id.");

    public static readonly Error SlotNotFound =
        Error.NotFound("SLOT_NOT_FOUND", "No slot was found with the given id.");

    public static readonly Error SlotOverlap =
        Error.Conflict("SLOT_OVERLAP", "This slot overlaps with an existing slot for the same station and date.");

    public static readonly Error SlotsAlreadyGenerated =
        Error.Conflict("SLOTS_ALREADY_GENERATED", "Slots have already been generated for this station and date.");

    public static readonly Error DayNotOperational =
        Error.Validation("DAY_NOT_OPERATIONAL", "The station is not scheduled to operate on this day, or its schedule is too short to fit a slot.");

    public static readonly Error SlotHasReservations =
        Error.Conflict("SLOT_HAS_RESERVATIONS", "This slot cannot be deleted, or have its capacity reduced, while it has active reservations.");
}