using MailKit.Net.Smtp;
using MailKit.Security;
using MicrogridApi.Configuration;
using Microsoft.Extensions.Options;
using MimeKit;

namespace MicrogridApi.Services;

public class EmailService(IOptions<EmailSettings> settings, ILogger<EmailService> logger)
{
    private readonly EmailSettings _settings = settings.Value;

    public Task SendRegistrationSuccessEmailAsync(string toEmail, string fullName) =>
        SendAsync(
            toEmail,
            "Registration received - SolarGridX",
            $"""
            Hi {fullName},

            Thanks for registering with SolarGridX. Your account has been created and is
            currently pending activation by our Backoffice team. You'll be able to log in
            once your account is activated.

            - SolarGridX
            """);

    public Task SendAccountCreatedEmailAsync(
        string toEmail, string fullName, string role, string temporaryPassword, string signInApp = "web application") =>
        SendAsync(
            toEmail,
            "Your SolarGridX account - sign-in details",
            $"""
            Hi {fullName},

            A SolarGridX {role} account has been created for you. Sign in on the
            {signInApp} with:

            Email:    {toEmail}
            Password: {temporaryPassword}

            Please keep these details private.

            - SolarGridX
            """);

    private async Task SendAsync(string toEmail, string subject, string body)
    {
        try
        {
            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(_settings.User));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;
            message.Body = new TextPart("plain") { Text = body };

            using var client = new SmtpClient();
            await client.ConnectAsync(_settings.Host, _settings.Port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_settings.User, _settings.Pass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send email '{Subject}' to {Email}", subject, toEmail);
        }
    }
}
