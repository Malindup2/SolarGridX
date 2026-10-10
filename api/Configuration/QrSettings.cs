/*
 * QrSettings.cs
 * Holds the shared secret used to sign and verify QR transaction tokens.
*/


namespace MicrogridApi.Configuration;

public class QrSettings
{
    public string HmacSecret { get; set; } = string.Empty;
}