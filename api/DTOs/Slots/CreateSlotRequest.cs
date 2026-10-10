/*
 * CreateSlotRequest.cs
 * Defines the fields required to manually create a single booking slot.
 */

namespace MicrogridApi.DTOs.Slots;

public record CreateSlotRequest(DateTime SlotDate, string StartTime, string EndTime, double CapacityKwh);