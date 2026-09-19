using MicrogridApi.Models;

namespace MicrogridApi.Common;

public static class RoleNames
{
    public const string Backoffice = nameof(Role.Backoffice);
    public const string GridOperator = nameof(Role.GridOperator);
    public const string Prosumer = nameof(Role.Prosumer);
}
