/*
 * ActivityDtos.cs
 * Defines response models for notifications, inboxes, audit entries, and search results.
 */

namespace MicrogridApi.DTOs.Activity;

public record NotificationResponse(
    string Id,
    string Category,
    string Priority,
    string Message,
    string Action,
    string? ResourceId,
    DateTime CreatedAt,
    DateTime? ReadAt);

public record NotificationInboxResponse(long UnreadCount, List<NotificationResponse> Items);

public record AuditEntryResponse(
    string Id,
    string Event,
    string ActorName,
    string? ActorRole,
    DateTime At,
    string? CorrelationId);

public record SearchHitResponse(string Kind, string Id, string Label, string? Sublabel);
