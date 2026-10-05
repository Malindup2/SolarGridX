using System.Threading.Channels;

namespace MicrogridApi.Services;

// Forgot-password requests are answered straight away and processed here in the background,
// so the response time never reveals whether an account exists for the email.
public class PasswordRecoveryQueue
{
    private readonly Channel<string> _channel = Channel.CreateBounded<string>(
        new BoundedChannelOptions(100) { FullMode = BoundedChannelFullMode.DropWrite });

    // False when the queue is full (a flood of requests); the caller answers 429.
    public bool TryEnqueue(string email) => _channel.Writer.TryWrite(email);

    public IAsyncEnumerable<string> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}

public class PasswordRecoveryWorker(
    PasswordRecoveryQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<PasswordRecoveryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var email in queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                await scope.ServiceProvider.GetRequiredService<PasswordRecoveryService>().SendResetAsync(email);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not process a password reset request.");
            }
        }
    }
}
