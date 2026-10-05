/*
 * UpdateProsumerRequestValidator.cs
 * Checks editable prosumer details.
 */

using FluentValidation;
using MicrogridApi.DTOs.Prosumers;

namespace MicrogridApi.Validators;

public class UpdateProsumerRequestValidator : AbstractValidator<UpdateProsumerRequest>
{
    // Requires a name and a valid email address.
    public UpdateProsumerRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}
