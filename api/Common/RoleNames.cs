/*
 * RoleNames.cs
 * Role names as constants, for use in [Authorize(Roles = ...)] attributes.
 */

using MicrogridApi.Models;

namespace MicrogridApi.Common;

public static class RoleNames
{
    public const string Backoffice = nameof(Role.Backoffice);
    public const string GridOperator = nameof(Role.GridOperator);
    public const string Prosumer = nameof(Role.Prosumer);
}
