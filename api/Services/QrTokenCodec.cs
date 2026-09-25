using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MicrogridApi.Services;

public static class QrTokenCodec
{
    // Turns a signed payload into the compact string carried by the QR image.
    public static string Encode(QrPayload payload) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload)));

    
    public static QrPayload? TryDecode(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        try
        {
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(token));
            return JsonSerializer.Deserialize<QrPayload>(json);
        }
        catch (Exception)
        {
            return null;
        }
    }

    // HMAC-SHA256 over the payload fields, in a fixed order.
    public static string ComputeSignature(
        string secret, string resId, string nic, string stationId, string issuedAtIso, string expIso)
    {
        var signingString = $"{resId}|{nic}|{stationId}|{issuedAtIso}|{expIso}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signingString));

        return Convert.ToBase64String(hash);
    }

    public static bool SignatureMatches(string secret, QrPayload payload)
    {
        var expected = ComputeSignature(
            secret, payload.ResId, payload.Nic, payload.StationId, payload.IssuedAt, payload.Exp);

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(payload.Sig ?? string.Empty));
    }

    public record QrPayload(
        [property: JsonPropertyName("resId")] string ResId,
        [property: JsonPropertyName("nic")] string Nic,
        [property: JsonPropertyName("stationId")] string StationId,
        [property: JsonPropertyName("issuedAt")] string IssuedAt,
        [property: JsonPropertyName("exp")] string Exp,
        [property: JsonPropertyName("sig")] string Sig);
}
