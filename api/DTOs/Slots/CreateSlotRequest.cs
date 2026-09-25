namespace MicrogridApi.DTOs.Slots;

public record CreateSlotRequest(DateTime SlotDate, string StartTime, string EndTime, double CapacityKwh);