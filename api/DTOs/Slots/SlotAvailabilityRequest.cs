/*
 * SlotAvailabilityRequest.cs
 * Defines the availability flag sent when toggling a single slot.
 */

namespace MicrogridApi.DTOs.Slots;

public record SlotAvailabilityRequest(bool IsAvailable);