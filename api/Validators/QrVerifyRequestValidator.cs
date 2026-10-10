/*
 * QrVerifyRequestValidator.cs
 * Checks the QR token and optional identifiers submitted for verification.
 */

using FluentValidation;
using MicrogridApi.DTOs.Qr;

namespace MicrogridApi.Validators;

public class QrVerifyRequestValidator : AbstractValidator<QrVerifyRequest>
{
    public QrVerifyRequestValidator()
    {
        RuleFor(x => x.QrToken).NotEmpty();
    }
}
