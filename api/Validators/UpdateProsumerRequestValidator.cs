/*
 * UpdateProsumerRequestValidator.cs
 * Checks the details submitted when updating a prosumer account.
 */

using FluentValidation;
using MicrogridApi.DTOs.Prosumers;

namespace MicrogridApi.Validators;

public class UpdateProsumerRequestValidator : AbstractValidator<UpdateProsumerRequest>
{
    public UpdateProsumerRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}
