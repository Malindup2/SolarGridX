using MicrogridApi.Configuration;
using MicrogridApi.Models;
using MongoDB.Driver;

namespace MicrogridApi.Repositories;

// The AuditLog and Notifications collections.
public class ActivityRepository
{
    private const int MaxItems = 100;
    private static readonly TimeSpan NotificationLifetime = TimeSpan.FromDays(90);

    private readonly IMongoCollection<AuditEntry> _audit;
    private readonly IMongoCollection<Notification> _notifications;

    public ActivityRepository(MongoDbContext context)
    {
        _audit = context.GetCollection<AuditEntry>("AuditLog");
        _notifications = context.GetCollection<Notification>("Notifications");
    }

    public async Task EnsureIndexesAsync()
    {
        await _audit.Indexes.CreateOneAsync(new CreateIndexModel<AuditEntry>(
            Builders<AuditEntry>.IndexKeys.Ascending(a => a.Kind).Ascending(a => a.EntityId).Descending(a => a.At)));

        await _notifications.Indexes.CreateManyAsync(
        [
            new CreateIndexModel<Notification>(
                Builders<Notification>.IndexKeys.Ascending(n => n.UserId).Descending(n => n.CreatedAt)),
            new CreateIndexModel<Notification>(
                Builders<Notification>.IndexKeys.Ascending(n => n.CreatedAt),
                new CreateIndexOptions { ExpireAfter = NotificationLifetime })
        ]);
    }

    public Task AddAuditAsync(AuditEntry entry) => _audit.InsertOneAsync(entry);

    public Task<List<AuditEntry>> AuditForAsync(string kind, string entityId) =>
        _audit.Find(a => a.Kind == kind && a.EntityId == entityId)
            .SortByDescending(a => a.At)
            .Limit(MaxItems)
            .ToListAsync();

    public Task AddNotificationsAsync(IEnumerable<Notification> notifications)
    {
        var list = notifications.ToList();
        return list.Count == 0 ? Task.CompletedTask : _notifications.InsertManyAsync(list);
    }

    public Task<List<Notification>> NotificationsForAsync(string userId, bool unreadOnly, NotificationPriority? priority)
    {
        var filter = Builders<Notification>.Filter.Eq(n => n.UserId, userId);
        if (unreadOnly)
        {
            filter &= Builders<Notification>.Filter.Eq(n => n.ReadAt, null);
        }

        if (priority is not null)
        {
            filter &= Builders<Notification>.Filter.Eq(n => n.Priority, priority.Value);
        }

        return _notifications.Find(filter).SortByDescending(n => n.CreatedAt).Limit(MaxItems).ToListAsync();
    }

    public Task<long> UnreadCountAsync(string userId) =>
        _notifications.CountDocumentsAsync(n => n.UserId == userId && n.ReadAt == null);

    // Only the owner can mark their notification; returns false when nothing matched.
    public async Task<bool> MarkReadAsync(string userId, string id)
    {
        var result = await _notifications.UpdateOneAsync(
            n => n.Id == id && n.UserId == userId,
            Builders<Notification>.Update.Set(n => n.ReadAt, DateTime.UtcNow));
        return result.MatchedCount > 0;
    }

    public Task MarkAllReadAsync(string userId) =>
        _notifications.UpdateManyAsync(
            n => n.UserId == userId && n.ReadAt == null,
            Builders<Notification>.Update.Set(n => n.ReadAt, DateTime.UtcNow));
}
