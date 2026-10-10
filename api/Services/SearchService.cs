/*
 * SearchService.cs
 * Searches permitted system records and returns results scoped to the caller's role.
 */

using System.Text.RegularExpressions;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Activity;
using MicrogridApi.Repositories;

namespace MicrogridApi.Services;

// Global search behind the web command palette (Ctrl/Cmd+K). What a role can find:
//   Backoffice    staff users, prosumers, stations
//   GridOperator  stations, prosumers, reservations
//   Prosumer      active stations and their own reservations
public class SearchService(
    UserRepository userRepository,
    StationRepository stationRepository,
    ReservationRepository reservationRepository)
{
    public const int PerKind = 5;

    public static readonly Error InvalidQuery = Error.Validation(
        "VALIDATION_FAILED", "One or more validation errors occurred.", ["q: type between 2 and 80 characters."]);

    public async Task<Result<List<SearchHitResponse>>> SearchAsync(string? q, string? callerRole, string? callerNic)
    {
        var query = q?.Trim() ?? string.Empty;
        if (query.Length is < 2 or > 80)
        {
            return InvalidQuery;
        }

        // User input is matched literally, never as a regular expression.
        var pattern = Regex.Escape(query);
        var hits = new List<SearchHitResponse>();

        if (callerRole == RoleNames.Backoffice)
        {
            hits.AddRange((await userRepository.SearchAsync(pattern, prosumers: false, PerKind))
                .Select(u => new SearchHitResponse("user", u.Id, u.FullName, $"{u.Role} · {u.Email}")));
        }

        if (callerRole is RoleNames.Backoffice or RoleNames.GridOperator)
        {
            hits.AddRange((await userRepository.SearchAsync(pattern, prosumers: true, PerKind))
                .Select(u => new SearchHitResponse("prosumer", u.Nic ?? u.Id, u.FullName, $"{u.Nic} · {u.Status}")));
        }

        hits.AddRange((await stationRepository.SearchAsync(pattern, activeOnly: callerRole == RoleNames.Prosumer, PerKind))
            .Select(s => new SearchHitResponse("station", s.Id, s.StationName, s.Location)));

        if (callerRole is RoleNames.GridOperator or RoleNames.Prosumer)
        {
            var ownNic = callerRole == RoleNames.Prosumer ? callerNic ?? "-" : null;
            hits.AddRange((await reservationRepository.SearchByIdOrNicAsync(pattern, ownNic, PerKind))
                .Select(r => new SearchHitResponse(
                    "reservation", r.Id,
                    $"{r.Nic} · {r.ReservationDate:ddd d MMM} {r.StartTime}-{r.EndTime}",
                    $"{r.Status} · {r.EnergyKwh} kWh")));
        }

        return hits;
    }
}
