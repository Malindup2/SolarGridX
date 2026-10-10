/*
 * DashboardService.cs
 * Prepares booking statistics and reservation summaries for prosumer and operator dashboards.
 */
 
using MicrogridApi.Common;
using MicrogridApi.DTOs.Dashboards;
using MicrogridApi.DTOs.Reservations;
using MicrogridApi.Models;
using MicrogridApi.Repositories;

namespace MicrogridApi.Services;

public class DashboardService(
    ReservationRepository reservationRepository,
    StationRepository stationRepository,
    UserRepository userRepository)
{
    // Counts shown on a prosumer's home screen.
    public async Task<Result<ProsumerDashboardResponse>> ProsumerAsync(
        string nic, string? callerNic, string? callerRole)
    {
        if (callerRole == RoleNames.Prosumer &&
            !string.Equals(callerNic, nic, StringComparison.OrdinalIgnoreCase))
        {
            return ReservationErrors.NotOwner;
        }

        var prosumer = await userRepository.FindProsumerByNicAsync(nic);
        if (prosumer is null)
        {
            return ReservationErrors.ProsumerNotFound;
        }

        var pending = await reservationRepository.CountAsync(ReservationStatus.Pending, nic: nic);
        var approved = await reservationRepository.CountAsync(ReservationStatus.Approved, nic: nic);
        var approvedFuture = await reservationRepository.CountAsync(
            ReservationStatus.Approved, nic: nic, futureOnly: true);

        return new ProsumerDashboardResponse(
            nic,
            (int)(pending + approved),
            (int)pending,
            (int)approvedFuture);
    }

    // Pending queue and approved future count for one microgrid node.
    public async Task<Result<OperatorDashboardResponse>> OperatorAsync(string stationId)
    {
        if (!ObjectIds.IsValid(stationId))
        {
            return ReservationErrors.StationNotFound;
        }

        var station = await stationRepository.FindByIdAsync(stationId);
        if (station is null)
        {
            return ReservationErrors.StationNotFound;
        }

        var pending = await reservationRepository.SearchAsync(
            null, ReservationStatus.Pending, stationId, null, null);

        var approvedFuture = await reservationRepository.CountAsync(
            ReservationStatus.Approved, stationId: stationId, futureOnly: true);

        var pendingReservations = pending
            .Select(r => ReservationMapper.ToResponse(r, station.StationName))
            .ToList();

        return new OperatorDashboardResponse(
            station.Id,
            station.StationName,
            pendingReservations.Count,
            (int)approvedFuture,
            pendingReservations);
    }
}
