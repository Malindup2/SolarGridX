using Microsoft.AspNetCore.Http;

namespace MicrogridApi.Common;

public class ApiException : Exception
{
    public int StatusCode { get; }
    public string Code { get; }
    public string[]? Details { get; }

    public ApiException(string code, string message, int statusCode = StatusCodes.Status400BadRequest, string[]? details = null)
        : base(message)
    {
        Code = code;
        StatusCode = statusCode;
        Details = details;
    }
}
