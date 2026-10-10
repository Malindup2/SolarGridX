/*
 * GenerateSlotsRequest.cs
 * Defines the date a Grid Operator requests slot generation for.
 */

namespace MicrogridApi.DTOs.Slots;

public record GenerateSlotsRequest(DateTime Date);