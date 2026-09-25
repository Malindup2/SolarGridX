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
