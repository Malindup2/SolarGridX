/*
 * ExportService.cs
 * Applies role and filter rules when preparing permitted records for CSV export.
 */
using System.Globalization;
using MicrogridApi.Common;
using MicrogridApi.Models;
using MicrogridApi.Repositories;

namespace MicrogridApi.Services;

public record ExportFilters(
    string? Q,
    string? Role,
    string? Status,
    string? Nic,
    string? StationId,
    DateTime? DateFrom,
    DateTime? DateTo);

public record ExportFile(byte[] Content, string FileName);

// CSV downloads of the list screens, using the same filters. Who may export what:
//   users         Backoffice
//   prosumers     Backoffice, GridOperator
//   stations      Backoffice, GridOperator
//   reservations  Backoffice, GridOperator
// Credentials, avatars and QR tokens are never exported.
public class ExportService(
    UserRepository userRepository,
    StationRepository stationRepository,
    ReservationRepository reservationRepository)
{
    public const int MaxRows = 5000;

    public static readonly Error UnknownKind = Error.Validation(
        "UNKNOWN_EXPORT", "Exports are available for users, prosumers, stations and reservations.");

    public static readonly Error Forbidden = Error.Forbidden(
        "EXPORT_FORBIDDEN", "Your role cannot export this list.");

    public static readonly Error TooLarge = Error.Validation(
        "EXPORT_TOO_LARGE", $"More than {MaxRows} rows match. Narrow the filters and export again.");

    public static Error BadFilter(string detail) => Error.Validation(
        "VALIDATION_FAILED", "One or more validation errors occurred.", [detail]);

    public async Task<Result<ExportFile>> ExportAsync(string kind, ExportFilters filters, string? callerRole)
    {
        kind = kind.Trim().ToLowerInvariant();

        var allowed = kind switch
        {
            "users" => callerRole == RoleNames.Backoffice,
            "prosumers" or "stations" or "reservations" => callerRole is RoleNames.Backoffice or RoleNames.GridOperator,
            _ => (bool?)null
        };

        if (allowed is null)
        {
            return UnknownKind;
        }

        if (allowed == false)
        {
            return Forbidden;
        }

        var stamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmm", CultureInfo.InvariantCulture);
        var rows = kind switch
        {
            "users" => await UsersAsync(filters),
            "prosumers" => await ProsumersAsync(filters),
            "stations" => await StationsAsync(filters),
            _ => await ReservationsAsync(filters)
        };

        if (rows.Error is not null)
        {
            return rows.Error;
        }

        if (rows.Rows!.Count > MaxRows)
        {
            return TooLarge;
        }

        return new ExportFile(CsvWriter.Write(rows.Header!, rows.Rows), $"solargridx-{kind}-{stamp}.csv");
    }

    private async Task<(string[]? Header, List<IReadOnlyList<string?>>? Rows, Error? Error)> UsersAsync(ExportFilters f)
    {
        var users = (await userRepository.ListWebUsersAsync()).AsEnumerable();

        if (!string.IsNullOrWhiteSpace(f.Role))
        {
            users = users.Where(u => string.Equals(u.Role.ToString(), f.Role, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(f.Status))
        {
            users = users.Where(u => string.Equals(u.Status.ToString(), f.Status, StringComparison.OrdinalIgnoreCase));
        }

        users = users.Where(u => Matches(f.Q, u.FullName, u.Email, u.Nic));

        return (["Id", "Full name", "Email", "Role", "Status", "NIC", "Phone", "Created (UTC)"],
            users.Select(u => (IReadOnlyList<string?>)[u.Id, u.FullName, u.Email, u.Role.ToString(), u.Status.ToString(), u.Nic, u.Phone, Iso(u.CreatedAt)]).ToList(),
            null);
    }

    private async Task<(string[]? Header, List<IReadOnlyList<string?>>? Rows, Error? Error)> ProsumersAsync(ExportFilters f)
    {
        UserStatus? status = null;
        if (!string.IsNullOrWhiteSpace(f.Status))
        {
            if (!Enum.TryParse<UserStatus>(f.Status, true, out var parsed) || !Enum.IsDefined(parsed))
            {
                return (null, null, BadFilter($"status: '{f.Status}' is not a known account status."));
            }

            status = parsed;
        }

        var prosumers = (await userRepository.ListProsumersAsync(status)).Where(u => Matches(f.Q, u.FullName, u.Email, u.Nic));

        return (["NIC", "Full name", "Email", "Phone", "Address", "Status", "Registered (UTC)"],
            prosumers.Select(u => (IReadOnlyList<string?>)[u.Nic, u.FullName, u.Email, u.Phone, u.Address, u.Status.ToString(), Iso(u.CreatedAt)]).ToList(),
            null);
    }

    private async Task<(string[]? Header, List<IReadOnlyList<string?>>? Rows, Error? Error)> StationsAsync(ExportFilters f)
    {
        var stations = (await stationRepository.GetAllAsync()).AsEnumerable();

        if (!string.IsNullOrWhiteSpace(f.Status))
        {
            stations = stations.Where(s => string.Equals(s.Status.ToString(), f.Status, StringComparison.OrdinalIgnoreCase));
        }

        stations = stations.Where(s => Matches(f.Q, s.StationName, s.Location));

        return (["Id", "Name", "Location", "Latitude", "Longitude", "Capacity (kWh)", "Battery bays", "Type", "Opens", "Closes", "Days", "Status"],
            stations.Select(s => (IReadOnlyList<string?>)[
                s.Id, s.StationName, s.Location, Num(s.Latitude), Num(s.Longitude), Num(s.CapacityKwh),
                s.BatterySlotCount.ToString(CultureInfo.InvariantCulture), s.Type.ToString(),
                s.OperationalSchedule.OpenTime, s.OperationalSchedule.CloseTime,
                string.Join(' ', s.OperationalSchedule.ActiveDays), s.Status.ToString()]).ToList(),
            null);
    }

    private async Task<(string[]? Header, List<IReadOnlyList<string?>>? Rows, Error? Error)> ReservationsAsync(ExportFilters f)
    {
        ReservationStatus? status = null;
        if (!string.IsNullOrWhiteSpace(f.Status))
        {
            if (!Enum.TryParse<ReservationStatus>(f.Status, true, out var parsed) || !Enum.IsDefined(parsed))
            {
                return (null, null, BadFilter($"status: '{f.Status}' is not a known reservation status."));
            }

            status = parsed;
        }

        if (f.StationId is not null && !ObjectIds.IsValid(f.StationId))
        {
            return (null, null, BadFilter("stationId: not a valid id."));
        }

        if (f.DateFrom > f.DateTo)
        {
            return (null, null, BadFilter("dateFrom: must be on or before dateTo."));
        }

        // One past the cap, so "too many" can be detected without loading everything.
        var reservations = await reservationRepository.FindForExportAsync(f.Nic, status, f.StationId, f.DateFrom, f.DateTo, MaxRows + 1);
        var names = (await stationRepository.GetAllAsync()).ToDictionary(s => s.Id, s => s.StationName);

        return (["Id", "NIC", "Station", "Date", "Start", "End", "Energy (kWh)", "Status", "Decided by", "Rejection reason", "Completed (UTC)", "Created (UTC)"],
            reservations.Select(r => (IReadOnlyList<string?>)[
                r.Id, r.Nic, names.GetValueOrDefault(r.StationId, r.StationId),
                r.ReservationDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), r.StartTime, r.EndTime,
                Num(r.EnergyKwh), r.Status.ToString(), r.ApprovedBy, r.RejectionReason,
                r.CompletedAt is { } done ? Iso(done) : null, Iso(r.CreatedAt)]).ToList(),
            null);
    }

    private static bool Matches(string? q, params string?[] fields) =>
        string.IsNullOrWhiteSpace(q) || fields.Any(field => field?.Contains(q.Trim(), StringComparison.OrdinalIgnoreCase) == true);

    private static string Iso(DateTime value) => value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture);

    private static string Num(double value) => value.ToString(CultureInfo.InvariantCulture);
}
