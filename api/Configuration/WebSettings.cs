namespace MicrogridApi.Configuration;

// Where the web application is served, used to build links in emails (password reset).
public class WebSettings
{
    public string BaseUrl { get; set; } = "http://localhost:5173";
}
