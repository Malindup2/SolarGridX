# Seed data

`seed.js` fills a database with everything needed to build and demo the full
journey, so nobody has to wait for another member's screens before starting.

Use **your own database name**. Everyone seeds their own copy, so you can create,
cancel and delete freely without breaking anyone else's work.

## What you get

| | |
|---|---|
| Users | 1 Backoffice, 1 Grid Operator, 3 Prosumers (Active, Pending, Deactivated) |
| Microgrid nodes | 2 — Negombo (AC, 4 bays) and Matara (DC, 3 bays) |
| Booking slots | Today plus the next 6 days, hourly, inside the 7-day window (BR-01) |
| Reservations | None — create these through the API so the business rules run |

## 1. Install mongosh

Download the MongoDB Shell from <https://www.mongodb.com/try/download/shell>,
or install it with winget:

```powershell
winget install MongoDB.Shell
```

## 2. Point the API at your own database

Edit `api/appsettings.Development.json` and give `DatabaseName` a name of your
own. Keep the connection string as it is.

```json
"MongoDbSettings": {
  "ConnectionString": "<the shared connection string>",
  "DatabaseName": "SolarGridX_yourname"
}
```

## 3. Run the seed

From the repository root, using the same connection string and **your** database
name:

```bash
mongosh "<connection-string>/SolarGridX_yourname" docs/seed/seed.js
```

It prints a summary when it finishes. Re-run it any time to reset — it clears
the four domain collections first and never touches `RevokedTokens`.

## 4. Sign in

| Email | Password | Role | Status |
|---|---|---|---|
| `admin@solargridx.com` | `Admin@12345` | Backoffice | Active |
| `operator@solargridx.com` | `Oper@12345` | Grid Operator | Active |
| `amal@example.com` | `Pros@12345` | Prosumer | Active — can book immediately |
| `nimali@example.com` | `Pros@12345` | Prosumer | Pending — appears in the activation queue |
| `sunil@example.com` | `Pros@12345` | Prosumer | Deactivated — login is refused with `403` |

Remember the client rules from README section 10.2: Backoffice signs in on web
only, Prosumers on mobile only, Grid Operators on both.

## Notes

- **Reservations are deliberately not seeded.** Create them through
  `POST /reservations` so BR-01 and BR-10 actually run and the slot's
  `ReservedCount` stays correct.
- **`capacityKwh` is the maximum energy a single booking may take**, not a pool
  that drains. Negombo is 120 kWh across 4 bays, so each slot is 30 kWh and up
  to 4 bookings can share it.
- **Slots start from today**, so re-run the seed if your slots drift outside the
  7-day booking window.
- **Passwords are BCrypt hashes** pre-computed in the script, because `mongosh`
  cannot hash. Changing a password there means generating a new hash.
