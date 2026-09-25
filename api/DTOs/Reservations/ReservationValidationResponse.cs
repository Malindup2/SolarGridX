namespace MicrogridApi.DTOs.Reservations;

public record ReservationValidationResponse(
    bool Valid,
    string? Code,
    string? Message);
