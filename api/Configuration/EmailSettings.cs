namespace MicrogridApi.Configuration;

public class EmailSettings
{
    public string Host { get; set; } = null!;
    public int Port { get; set; }
    public string User { get; set; } = null!;
    public string Pass { get; set; } = null!;
}
