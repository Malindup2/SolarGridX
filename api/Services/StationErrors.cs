/*
 * StationErrors.cs
 * Defines validation, lookup, and conflict errors for station operations.
 */

using MicrogridApi.Common;

namespace MicrogridApi.Services;

public static class StationErrors
{
    public static Error ValidationFailed(string[] details)
    {
        // Return the field errors collected by the request validator.
        return Error.Validation(
            "VALIDATION_FAILED",
            "One or more validation errors occurred.",
            details);
    }

    public static readonly Error InvalidId = Error.Validation(
        "VALIDATION_FAILED",
        "The station ID is invalid.",
        ["id: Station ID must be a valid MongoDB ObjectId."]);

    public static readonly Error NotFound = Error.NotFound(
        "STATION_NOT_FOUND",
        "No station exists with the requested ID.");

    public static readonly Error RemovedBeforeUpdate = Error.NotFound(
        "STATION_NOT_FOUND",
        "The station was removed before it could be updated.");

    public static readonly Error RemovedBeforeScheduleUpdate = Error.NotFound(
        "STATION_NOT_FOUND",
        "The station was removed before its schedule could be updated.");

    public static readonly Error RemovedBeforeActivation = Error.NotFound(
        "STATION_NOT_FOUND",
        "The station was removed before it could be activated.");

    public static readonly Error RemovedBeforeDeactivation = Error.NotFound(
        "STATION_NOT_FOUND",
        "The station was removed before it could be deactivated.");

    public static readonly Error RemovedBeforeDeletion = Error.NotFound(
        "STATION_NOT_FOUND",
        "The station was removed before it could be deleted.");

    public static readonly Error CapacityChangeBlocked = Error.Conflict(
        "STATION_CAPACITY_CHANGE_BLOCKED",
        "Cannot reduce station capacity or change battery-slot count while upcoming slots exist.");

    public static readonly Error ScheduleConflict = Error.Conflict(
        "STATION_SCHEDULE_CONFLICT",
        "An upcoming slot falls outside the proposed operating days or hours.");

    public static Error ActiveReservations(string[] details)
    {
        // Include the reservations preventing deactivation.
        return new Error(
            "STATION_HAS_ACTIVE_RESERVATIONS",
            "The station cannot be deactivated while active reservations exist.",
            ErrorType.Conflict,
            details);
    }

    public static Error Dependencies(string[] details)
    {
        // Identify which linked records prevent deletion.
        return new Error(
            "STATION_HAS_DEPENDENCIES",
            "The station cannot be deleted while slots or reservations reference it.",
            ErrorType.Conflict,
            details);
    }
}
