/*
 * BulkAvailabilityRequest.cs
 * Defines the slot IDs and availability flag sent for a bulk toggle.
 */

namespace MicrogridApi.DTOs.Slots;

public record BulkAvailabilityRequest(List<string> SlotIds, bool IsAvailable);