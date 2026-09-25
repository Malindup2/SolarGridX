using MongoDB.Bson;

namespace MicrogridApi.Common;
// FormatException and would surface as a 500 instead of a 4xx.
public static class ObjectIds
{
    public static bool IsValid(string? id) =>
        !string.IsNullOrWhiteSpace(id) && ObjectId.TryParse(id, out _);

    public static Error Invalid(string field) =>
        Error.Validation(
            "VALIDATION_FAILED",
            "One or more validation errors occurred.",
            [$"{field}: must be a valid MongoDB ObjectId."]);
}
