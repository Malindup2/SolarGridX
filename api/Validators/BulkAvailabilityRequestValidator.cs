/*
 * BulkAvailabilityRequestValidator.cs
 * Checks that at least one slot ID was supplied for a bulk toggle.
 */

using FluentValidation;
using MicrogridApi.DTOs.Slots;

namespace MicrogridApi.Validators;

public class BulkAvailabilityRequestValidator : AbstractValidator<BulkAvailabilityRequest>
{
    public BulkAvailabilityRequestValidator()
    {
                // Reject an empty list of slot IDs.

        RuleFor(x => x.SlotIds).NotEmpty();
    }
}