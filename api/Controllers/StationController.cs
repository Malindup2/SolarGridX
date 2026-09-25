using MicrogridApi.DTOs.Stations;
using MicrogridApi.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicrogridApi.Controllers;

// NOTE (Member 4): TEMPORARY read-only stub, created only so the Member 4
// web UI has a station list to populate its dropdown while Member 3's real
// StationController does not exist yet. Delete or hand this over to
// Member 3 once the real StationController is merged into dev — do not
// let both exist at the same time.
[Route("api/stations")]
[Authorize]
public class StationController(StationRepository stationRepository) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(List<StationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var stations = await stationRepository.FindAllAsync();
        var response = stations.Select(s => new StationResponse(
            s.Id, s.StationName, s.Location, s.Latitude, s.Longitude,
            s.CapacityKwh, s.BatterySlotCount, s.Type.ToString(), s.Status.ToString()));
        return Ok(response);
    }
}