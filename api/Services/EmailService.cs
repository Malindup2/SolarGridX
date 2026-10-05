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

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_settings.Host) && !string.IsNullOrWhiteSpace(_settings.User);

    public Task SendPasswordResetAsync(string toEmail, string fullName, string resetLink, TimeSpan validFor)
    {
        // Local development without SMTP: the link is the only way to finish the flow, so log it.
        // Never happens once EmailSettings are configured.
        if (!IsConfigured)
        {
            logger.LogInformation("SMTP is not configured. Password reset link for {Email}: {Link}", toEmail, resetLink);
            return Task.CompletedTask;
        }

        return SendAsync(
            toEmail,
            "Reset your SolarGridX password",
            $"""
            Hi {fullName},

            We received a request to reset your SolarGridX password. Open this link to
            choose a new one. It works once and expires in {validFor.TotalMinutes:0} minutes:

            {resetLink}

            If you did not ask for this, you can ignore this email; your password stays the same.

            - SolarGridX
            """);
    }

    public Task SendPasswordChangedAsync(string toEmail, string fullName) =>
        SendAsync(
            toEmail,
            "Your SolarGridX password was changed",
            $"""
            Hi {fullName},

            The password for your SolarGridX account was just changed, and every device
            that was signed in has been signed out.

            If this wasn't you, reset your password straight away and contact the Backoffice.

            - SolarGridX
            """);

    public Task SendAccountStatusAsync(string toEmail, string fullName, bool activated) =>
        SendAsync(
            toEmail,
            activated ? "Your SolarGridX account is active" : "Your SolarGridX account has been deactivated",
            activated
                ? $"""
                  Hi {fullName},

                  Good news: the Backoffice team has activated your SolarGridX account. Sign in
                  on the SolarGridX mobile app to reserve energy transfer slots.

                  - SolarGridX
                  """
                : $"""
                  Hi {fullName},

                  Your SolarGridX account has been deactivated and can no longer sign in.
                  Only the Backoffice team can reactivate it; contact them if you think this is a mistake.

                  - SolarGridX
                  """);

    private async Task SendAsync(string toEmail, string subject, string body)
    {
        if (!IsConfigured)
        {
            logger.LogDebug("SMTP is not configured; skipped email '{Subject}' to {Email}", subject, toEmail);
            return;
        }

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
