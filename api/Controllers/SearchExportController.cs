using MicrogridApi.Common;
using MicrogridApi.DTOs.Activity;
using MicrogridApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

[Route("api")]
[Authorize]
public class SearchExportController(SearchService searchService, ExportService exportService) : ApiControllerBase
{
    // Global search for the command palette; results depend on the caller's role.
    [HttpGet("search")]
    [ProducesResponseType(typeof(List<SearchHitResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        var result = await searchService.SearchAsync(q, CallerRole, CallerNic);
        return ToResponse(result, hits => Ok(hits));
    }

    // CSV download of users, prosumers, stations or reservations, with the list screen's filters.
    [HttpGet("exports/{kind}.csv")]
    [Authorize(Roles = $"{RoleNames.Backoffice},{RoleNames.GridOperator}")]
    // Errors stay JSON; only a success is CSV (a [Produces] filter would turn errors into 406).
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK, "text/csv")]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Export(
        string kind,
        [FromQuery] string? q,
        [FromQuery] string? role,
        [FromQuery] string? status,
        [FromQuery] string? nic,
        [FromQuery] string? stationId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        var result = await exportService.ExportAsync(
            kind, new ExportFilters(q, role, status, nic, stationId, dateFrom, dateTo), CallerRole);

        if (!result.IsSuccess)
        {
            return ToErrorResponse(result.Error!);
        }

        Response.Headers.CacheControl = "private, no-store";
        return File(result.Value.Content, "text/csv; charset=utf-8", result.Value.FileName);
    }
}
