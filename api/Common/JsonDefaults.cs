using System.Text.Json;

namespace MicrogridApi.Common;

public static class JsonDefaults
{
    public static readonly JsonSerializerOptions CamelCase = new(JsonSerializerDefaults.Web);
}
