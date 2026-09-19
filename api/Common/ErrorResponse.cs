namespace MicrogridApi.Common;

public record ErrorResponse(string Code, string Message, string[]? Details);
