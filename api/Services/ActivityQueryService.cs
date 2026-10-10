/*
 * ActivityQueryService.cs
 * Applies access rules when retrieving notifications and audit history or updating notification read states.
 */
 
using MicrogridApi.Common;
using MicrogridApi.DTOs.Activity;
using MicrogridApi.Models;
using MicrogridApi.Repositories;
using MongoDB.Bson;

namespace MicrogridApi.Services;

public static class ActivityErrors
{
    public static readonly Error UnknownKind = Error.Validation(
        "UNKNOWN_AUDIT_KIND", "Audit history is available for users, stations, slots and reservations.");

    public static readonly Error InvalidPriority = Error.Validation(
        "VALIDATION_FAILED", "One or more validation errors occurred.", ["priority: must be High, Medium or Low."]);

    public static readonly Error NotificationNotFound =
        Error.NotFound("NOTIFICATION_NOT_FOUND", "No notification was found with the given id.");

    public static readonly Error AuditForbidden =
        Error.Forbidden("AUDIT_FORBIDDEN", "You cannot view the history of this record.");

    public static readonly Error RecordNotFound =
        Error.NotFound("RECORD_NOT_FOUND", "No record was found with the given id.");
}

// Inbox and audit-trail reads, with the access rules for who may see whose history.
public class ActivityQueryService(
    ActivityRepository activityRepository,
    UserRepository userRepository,
    ReservationRepository reservationRepository)
{
    public async Task<Result<NotificationInboxResponse>> InboxAsync(string? callerId, bool unreadOnly, string? priority)
    {
        NotificationPriority? parsed = null;
        if (!string.IsNullOrWhiteSpace(priority))
        {
            if (!Enum.TryParse<NotificationPriority>(priority, ignoreCase: true, out var value) || !Enum.IsDefined(value))
            {
                return ActivityErrors.InvalidPriority;
            }

            parsed = value;
        }

        if (string.IsNullOrEmpty(callerId))
        {
            return new NotificationInboxResponse(0, []);
        }

        var items = await activityRepository.NotificationsForAsync(callerId, unreadOnly, parsed);
        var unread = await activityRepository.UnreadCountAsync(callerId);

        return new NotificationInboxResponse(unread, items.Select(n => new NotificationResponse(
            n.Id, n.Category.ToString(), n.Priority.ToString(), n.Message, n.Action, n.ResourceId, n.CreatedAt, n.ReadAt)).ToList());
    }

    public async Task<Result> MarkReadAsync(string? callerId, string id)
    {
        if (string.IsNullOrEmpty(callerId) || !ObjectId.TryParse(id, out _))
        {
            return ActivityErrors.NotificationNotFound;
        }

        return await activityRepository.MarkReadAsync(callerId, id)
            ? Result.Success()
            : ActivityErrors.NotificationNotFound;
    }

    public async Task<Result> MarkAllReadAsync(string? callerId)
    {
        if (!string.IsNullOrEmpty(callerId))
        {
            await activityRepository.MarkAllReadAsync(callerId);
        }

        return Result.Success();
    }

    // users/me works for everyone; otherwise:
    //   users        Backoffice (a prosumer can be looked up by NIC)
    //   stations     Backoffice, GridOperator
    //   slots        Backoffice, GridOperator
    //   reservations Backoffice, GridOperator, or the prosumer who owns it
    public async Task<Result<List<AuditEntryResponse>>> AuditAsync(
        string kind, string id, string? callerId, string? callerRole, string? callerNic)
    {
        kind = kind.Trim().ToLowerInvariant();
        if (!AuditKinds.All.Contains(kind))
        {
            return ActivityErrors.UnknownKind;
        }

        var entityId = id;

        switch (kind)
        {
            case AuditKinds.Users when id == "me":
                if (string.IsNullOrEmpty(callerId))
                {
                    return ActivityErrors.AuditForbidden;
                }

                entityId = callerId;
                break;

            case AuditKinds.Users:
                if (callerRole != RoleNames.Backoffice && id != callerId)
                {
                    return ActivityErrors.AuditForbidden;
                }

                // Prosumer pages know the NIC, not the internal id.
                if (!ObjectId.TryParse(id, out _))
                {
                    var prosumer = await userRepository.FindProsumerByNicAnyCaseAsync(id);
                    if (prosumer is null)
                    {
                        return ActivityErrors.RecordNotFound;
                    }

                    entityId = prosumer.Id;
                }

                break;

            case AuditKinds.Stations or AuditKinds.Slots:
                if (callerRole == RoleNames.Prosumer)
                {
                    return ActivityErrors.AuditForbidden;
                }

                break;

            case AuditKinds.Reservations when callerRole == RoleNames.Prosumer:
                var reservation = ObjectId.TryParse(id, out _) ? await reservationRepository.FindByIdAsync(id) : null;
                if (reservation is null)
                {
                    return ActivityErrors.RecordNotFound;
                }

                if (!string.Equals(reservation.Nic, callerNic, StringComparison.OrdinalIgnoreCase))
                {
                    return ActivityErrors.AuditForbidden;
                }

                break;
        }

        var entries = await activityRepository.AuditForAsync(kind, entityId);
        return entries.Select(e => new AuditEntryResponse(e.Id, e.Event, e.ActorName, e.ActorRole, e.At, e.CorrelationId)).ToList();
    }
}
