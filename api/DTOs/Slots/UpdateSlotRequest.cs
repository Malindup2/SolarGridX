/*
 * UpdateSlotRequest.cs
 * Defines the fields that can be changed on an existing booking slot.
 */

namespace MicrogridApi.DTOs.Slots;

/// <param name="ExpectedUpdatedAt">Optional edit-conflict check, see UpdateReservationRequest.</param>
public record UpdateSlotRequest(DateTime SlotDate, string StartTime, string EndTime, double CapacityKwh, DateTime? ExpectedUpdatedAt = null);
