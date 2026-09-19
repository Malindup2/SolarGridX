using MailKit.Net.Smtp;
using MailKit.Security;
using MicrogridApi.Configuration;
using Microsoft.Extensions.Options;
using MimeKit;

namespace MicrogridApi.Services;

public class EmailService(IOptions<EmailSettings> settings, ILogger<EmailService> logger)
{
    private readonly EmailSettings _settings = settings.Value;

    public async Task SendRegistrationSuccessEmailAsync(string toEmail, string fullName)
    {
        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(_settings.User));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = "Registration received - SolarGridX";
        message.Body = new TextPart("plain")
        {
            Text = $"""
                Hi {fullName},

                Thanks for registering with SolarGridX. Your account has been created and is
                currently pending activation by our Backoffice team. You'll be able to log in
                once your account is activated.

                - SolarGridX
                """
        };

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(_settings.Host, _settings.Port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_settings.User, _settings.Pass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send registration email to {Email}", toEmail);
        }
    }
}
