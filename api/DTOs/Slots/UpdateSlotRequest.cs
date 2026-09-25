namespace MicrogridApi.DTOs.Slots;

public record UpdateSlotRequest(DateTime SlotDate, string StartTime, string EndTime, double CapacityKwh);