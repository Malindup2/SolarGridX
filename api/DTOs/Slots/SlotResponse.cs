/*
 * SlotResponse.cs
 * Defines the slot details returned to API clients.
 */

namespace MicrogridApi.DTOs.Slots;

public record SlotResponse(
    string Id,
    string StationId,
    DateTime SlotDate,
    string StartTime,
    string EndTime,
    double CapacityKwh,
    bool IsAvailable,
    int ReservedCount,
    // The version an editor sends back as ExpectedUpdatedAt to detect someone else's change.
    DateTime UpdatedAt);