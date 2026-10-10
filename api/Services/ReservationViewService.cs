/*
 * ReservationViewService.cs
 * Builds paginated current, pending, and historical reservation views using access rules and slot times.
 */

using System.Globalization;
using MicrogridApi.Common;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;
using MicrogridApi.Repositories;

namespace MicrogridApi.Services;

// Current / Pending / History booking views. Membership is decided at query time from the
// server clock and the slot's end, so nothing ever has to rewrite a reservation's status:
//   current  Approved and not yet ended
//   pending  Pending (including ones whose slot has already passed)
//   history  Rejected, Cancelled or Completed, or Pending/Approved whose slot has ended
public class ReservationViewService(ReservationRepository reservationRepository, StationRepository stationRepository)
{
    public const int MaxPageSize = 100;

    public static readonly string[] Views = ["current", "pending", "history"];

    public static readonly Error UnknownView = Error.Validation(
        "UNKNOWN_VIEW", "The booking view must be current, pending or history.");

    public static readonly Error InvalidPaging = Error.Validation(
        "VALIDATION_FAILED", "One or more validation errors occurred.",
        [$"page: must be 1 or more; pageSize: must be between 1 and {MaxPageSize}."]);

    public async Task<Result<ReservationPageResponse>> ViewAsync(
        string view, string? nic, string? stationId, int page, int pageSize,
        string? callerNic, string? callerRole)
    {
        view = view.Trim().ToLowerInvariant();
        if (!Views.Contains(view))
        {
            return UnknownView;
        }

        if (page < 1 || pageSize < 1 || pageSize > MaxPageSize)
        {
            return InvalidPaging;
        }

        if (stationId is not null && !ObjectIds.IsValid(stationId))
        {
            return ObjectIds.Invalid("stationId");
        }

        // A prosumer only ever sees their own bookings, whatever the query string says.
        var effectiveNic = callerRole == RoleNames.Prosumer ? callerNic : nic;
        var now = BusinessClock.Now;

        IEnumerable<EnergyReservation> matches = view switch
        {
            "current" => (await reservationRepository.FindViewCandidatesAsync(
                    [ReservationStatus.Approved], effectiveNic, stationId, now.Date.AddDays(-1), null))
                .Where(r => EndsAt(r) > now)
                .OrderBy(StartsAt),

            "pending" => (await reservationRepository.FindViewCandidatesAsync(
                    [ReservationStatus.Pending], effectiveNic, stationId, null, null))
                .OrderBy(StartsAt),

            _ => (await reservationRepository.FindViewCandidatesAsync(
                    [ReservationStatus.Rejected, ReservationStatus.Cancelled, ReservationStatus.Completed,
                     ReservationStatus.Pending, ReservationStatus.Approved],
                    effectiveNic, stationId, null, null))
                .Where(r => r.Status is not (ReservationStatus.Pending or ReservationStatus.Approved) || EndsAt(r) <= now)
                .OrderByDescending(StartsAt)
        };

        var all = matches.ToList();
        var stations = (await stationRepository.GetAllAsync()).ToDictionary(s => s.Id, s => s.StationName);

        var items = all
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => ReservationMapper.ToResponse(r, stations.GetValueOrDefault(r.StationId, string.Empty)))
            .ToList();

        return new ReservationPageResponse(items, page, pageSize, all.Count);
    }

    public static DateTime StartsAt(EnergyReservation reservation) => Combine(reservation.ReservationDate, reservation.StartTime);

    // A slot ending at "00:00" ends at midnight at the end of its day.
    public static DateTime EndsAt(EnergyReservation reservation)
    {
        var end = Combine(reservation.ReservationDate, reservation.EndTime);
        return end <= StartsAt(reservation) ? end.AddDays(1) : end;
    }

    private static DateTime Combine(DateTime date, string time)
    {
        var parts = time.Split(':');
        var hour = int.Parse(parts[0], CultureInfo.InvariantCulture);
        var minute = int.Parse(parts[1], CultureInfo.InvariantCulture);
        return new DateTime(date.Year, date.Month, date.Day, hour, minute, 0, DateTimeKind.Unspecified);
    }
}
