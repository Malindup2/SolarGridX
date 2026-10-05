using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using MongoDB.Bson;

namespace MicrogridApi.Services;

// Who should hear about an event. Any mix of specific users, whole roles and prosumers by NIC.
public sealed record Recipients(
    IReadOnlyCollection<string>? UserIds = null,
    IReadOnlyCollection<Role>? Roles = null,
    IReadOnlyCollection<string>? Nics = null)
{
    public static readonly Recipients None = new();

    public static Recipients ForProsumer(string nic) => new(Nics: [nic]);

    public static Recipients ForUser(string userId) => new(UserIds: [userId]);

    public static Recipients ForRole(Role role) => new(Roles: [role]);

    public Recipients And(Recipients other) => new(
        [.. UserIds ?? [], .. other.UserIds ?? []],
        [.. Roles ?? [], .. other.Roles ?? []],
        [.. Nics ?? [], .. other.Nics ?? []]);

    public bool IsEmpty => (UserIds?.Count ?? 0) + (Roles?.Count ?? 0) + (Nics?.Count ?? 0) == 0;
}

// Writes the audit trail and the matching inbox notifications. Recording is best effort:
// a failure here is logged and never undoes or fails the business change that triggered it.
public class ActivityService(
    ActivityRepository activityRepository,
    UserRepository userRepository,
    IHttpContextAccessor httpContextAccessor,
    ILogger<ActivityService> logger)
{
    public async Task RecordAsync(
        string kind,
        string entityId,
        string @event,
        string message,
        NotificationCategory category,
        string action,
        Recipients? recipients = null,
        NotificationPriority? priority = null,
        string? resourceId = null)
    {
        try
        {
            var http = httpContextAccessor.HttpContext;
            var principal = http?.User;
            var actorId = principal?.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal?.FindFirstValue(JwtRegisteredClaimNames.Sub);
            var now = DateTime.UtcNow;

            await activityRepository.AddAuditAsync(new AuditEntry
            {
                Id = ObjectId.GenerateNewId().ToString(),
                Kind = kind,
                EntityId = entityId,
                Event = @event,
                ActorId = actorId,
                ActorName = principal?.FindFirstValue(ClaimTypes.Name) ?? "System",
                ActorRole = principal?.FindFirstValue(ClaimTypes.Role),
                At = now,
                CorrelationId = http?.TraceIdentifier
            });

            if (recipients is null || recipients.IsEmpty)
            {
                return;
            }

            var userIds = await ResolveAsync(recipients);

            // Nobody needs a notification about their own action.
            if (actorId is not null)
            {
                userIds.Remove(actorId);
            }

            var resolvedPriority = priority ?? PriorityFor(@event);
            await activityRepository.AddNotificationsAsync(userIds.Select(userId => new Notification
            {
                Id = ObjectId.GenerateNewId().ToString(),
                UserId = userId,
                Category = category,
                Priority = resolvedPriority,
                Message = message,
                Action = action,
                ResourceId = resourceId ?? entityId,
                CreatedAt = now
            }));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not record activity {Event} for {Kind}/{EntityId}", @event, kind, entityId);
        }
    }

    private async Task<HashSet<string>> ResolveAsync(Recipients recipients)
    {
        var ids = new HashSet<string>(recipients.UserIds ?? []);

        foreach (var role in recipients.Roles ?? [])
        {
            ids.UnionWith(await userRepository.ActiveIdsByRoleAsync(role));
        }

        foreach (var nic in recipients.Nics ?? [])
        {
            var prosumer = await userRepository.FindProsumerByNicAnyCaseAsync(nic);
            if (prosumer is not null)
            {
                ids.Add(prosumer.Id);
            }
        }

        return ids;
    }

    // Bad news is High, decisions are Medium, everything else is Low.
    public static NotificationPriority PriorityFor(string @event) =>
        @event.Contains("Rejected") || @event.Contains("Deactivated") || @event.StartsWith("Password")
            ? NotificationPriority.High
            : @event.Contains("Approved") || @event.Contains("Completed") || @event.Contains("Cancelled") || @event.Contains("Activated")
                ? NotificationPriority.Medium
                : NotificationPriority.Low;
}

// Where a notification's "Open" button leads (the clients map these to their own routes).
public static class ActivityActions
{
    public const string Reservation = "Reservation";
    public const string Station = "Station";
    public const string Prosumer = "Prosumer";
    public const string User = "User";
    public const string Profile = "Profile";
}
