/*
 * QrVerifyRequest.cs
 * Defines the QR token and optional operator and station information submitted for verification.
 */
namespace MicrogridApi.DTOs.Qr;

public record QrVerifyRequest(
    string QrToken,
    string? OperatorId,
    string? StationId);
