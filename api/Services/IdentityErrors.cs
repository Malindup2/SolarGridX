using MicrogridApi.Common;

namespace MicrogridApi.Services;

public static class IdentityErrors
{
    public static readonly Error UserNotFound =
        Error.NotFound("USER_NOT_FOUND", "No web application user exists with this id.");

    public static readonly Error ProsumerNotFound =
        Error.NotFound("PROSUMER_NOT_FOUND", "No prosumer exists with this NIC.");

    public static readonly Error NotOwnProfile =
        Error.Forbidden("NOT_OWN_PROFILE", "Prosumers can only view and change their own profile.");

    public static readonly Error CannotChangeOwnAccess =
        Error.Conflict("CANNOT_CHANGE_OWN_ACCESS", "You cannot change your own role or status, or delete your own account.");

    public static readonly Error LastBackoffice =
        Error.Conflict("LAST_BACKOFFICE", "At least one active Backoffice user must remain.");

    public static readonly Error ProsumerAlreadyActive =
        Error.Conflict("PROSUMER_ALREADY_ACTIVE", "This prosumer account is already active.");

    public static readonly Error ProsumerAlreadyDeactivated =
        Error.Conflict("PROSUMER_ALREADY_DEACTIVATED", "This prosumer account is already deactivated.");

    public static readonly Error InvalidStatusFilter =
        Error.Validation("INVALID_STATUS", "Status must be Pending, Active or Deactivated.");
}
