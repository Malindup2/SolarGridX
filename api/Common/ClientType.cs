namespace MicrogridApi.Common;

public enum ClientType
{
    Unspecified,
    Web,
    Mobile
}

public static class ClientTypes
{
    public const string HeaderName = "X-Client-Type";

    public static ClientType Parse(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "web" => ClientType.Web,
        "mobile" => ClientType.Mobile,
        _ => ClientType.Unspecified
    };
}
