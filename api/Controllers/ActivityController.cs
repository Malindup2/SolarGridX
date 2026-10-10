/*
 * ActivityController.cs
 * Handles notification inbox, read-status, and audit-history requests.
 */

using MicrogridApi.Common;
using MicrogridApi.DTOs.Activity;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

// Inbox notifications and the audit trail of a record.
[Route("api")]
[Authorize]
public class ActivityController(ActivityQueryService activityQueryService) : ApiControllerBase
{
    // The caller's newest notifications (at most 100) plus their total unread count.
    [HttpGet("notifications")]
    [ProducesResponseType(typeof(NotificationInboxResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Notifications([FromQuery] bool unreadOnly = false, [FromQuery] string? priority = null)
    {
        var result = await activityQueryService.InboxAsync(CallerId, unreadOnly, priority);
        return ToResponse(result, inbox => Ok(inbox));
    }

    [HttpPost("notifications/{id}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkRead(string id)
    {
        var result = await activityQueryService.MarkReadAsync(CallerId, id);
        return ToResponse(result, () => NoContent());
    }

    [HttpPost("notifications/read-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkAllRead()
    {
        var result = await activityQueryService.MarkAllReadAsync(CallerId);
        return ToResponse(result, () => NoContent());
    }

    // What happened to a user, station, slot or reservation, newest first.
    [HttpGet("audit/{kind}/{id}")]
    [ProducesResponseType(typeof(List<AuditEntryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Audit(string kind, string id)
    {
        var result = await activityQueryService.AuditAsync(kind, id, CallerId, CallerRole, CallerNic);
        return ToResponse(result, entries => Ok(entries));
    }
}
