namespace MicrogridApi.DTOs.Slots;

public record BulkAvailabilityRequest(List<string> SlotIds, bool IsAvailable);