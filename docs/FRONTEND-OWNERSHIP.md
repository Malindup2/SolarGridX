# Frontend ownership

The backend is finished — about 70 endpoints, all tested (see Readme section 10). This document says exactly
which screens and files **each person owns**, so nobody builds the same thing
twice.

Read your own section, then the **Gotchas** at the end. Those are real
behaviours of the API that will waste your time if you find them yourself.

---

## 1. Before you write any code

**Seed your own database.** Follow `docs/seed/README.md`. Give
`DatabaseName` a name of your own (`SolarGridX_yourname`) so you can create and
delete freely without breaking anyone else.

You do **not** need to wait for another member's screens. After seeding you have
stations, slots and users in every state, so all four of us build in parallel
starting now.

Run the API with `dotnet run` in `api/`, then confirm
<http://localhost:5187/swagger> opens. Every endpoint below is in there with its
request and response shape — use it before asking.

---

## 2. Ground rules

1. **Build UI → service function → endpoint → loading → success → error.**
   Never a pretty static screen with the API "added later".
2. **Never re-implement a business rule in React or Kotlin.** The API owns
   BR-01 to BR-24. Call it, and display the error it returns.
3. **Stay inside your own folders.** If you need a change in a shared file, see
   the table in section 3.
4. **Reuse, don't rebuild.** If another member owns a screen you need, link to
   their route and pass ids. Do not build your own version of it.
5. **Pull before you start editing, and run a build before you push.**
   `dev` has been broken twice by pushes that did not compile.

---

## 3. Shared files — only the listed owner edits these

| File | Owner | Everyone else |
|---|---|---|
| `web/src/routes.tsx` | **M1** | Send M1 your route, don't edit |
| `web/src/layouts/*` | **M1** | — |
| `web/src/components/ui/*` | **M1** | Use them, don't add without telling M1 |
| `web/src/services/api.ts` | **M1** | Already handles token + errors |
| `web/src/context/AuthContext.tsx` | **M2** | Read `auth` from `useAuth()` |
| `mobile/.../MainActivity.kt` | **M2** | — |
| `mobile/.../res/navigation/nav_graph.xml` | **M2** | Edit your own `nav_*.xml` |
| Mobile bottom navigation + role routing | **M2** | — |
| `mobile/app/build.gradle.kts` | **M3** | Ask before adding a dependency |
| `api/**` | Nobody | Backend is frozen. Raise it in the group first |

Everything else belongs to whoever owns the feature.

---

## 4. Member 1 — Reservations, bookings and dashboards

**Web:** `web/src/pages/reservations/`, `web/src/services/reservationService.ts`,
`web/src/types/reservation.ts`
**Mobile:** `com.solargridx.mobile.reservations`, `api/ReservationApi.kt`,
`res/navigation/nav_reservations.xml`

### Web screens

| Screen | Endpoint |
|---|---|
| Reservation list + filters (operator/backoffice) | `GET /reservations?nic=&status=&stationId=` |
| Booking monitor with date range | `GET /bookings/search?dateFrom=&dateTo=` |
| Reservation details | `GET /reservations/{id}` |
| Approve | `PATCH /reservations/{id}/approve` |
| Reject with reason | `PATCH /reservations/{id}/reject` |
| Cancel confirmation | `PATCH /reservations/{id}/cancel` |
| Prosumer dashboard cards | `GET /dashboard/prosumer/{nic}` |
| Operator dashboard + **station picker** | `GET /dashboard/operator/{stationId}` |
| Completion / summary page after each action | response of the call just made |

### Mobile screens

| Screen | Endpoint |
|---|---|
| Prosumer home | `GET /dashboard/prosumer/{nic}` |
| **Operator home** (station picker + today's counts) | `GET /dashboard/operator/{stationId}` |
| Energy input, then booking confirmation (review before submit) | `POST /reservations` |
| **Booking summary** after create / reschedule / cancel — **scored, 2 marks** | response of the call just made |
| My bookings (Upcoming / History tabs) | `GET /reservations` |
| Booking details — Pending / Approved / Rejected / Completed | `GET /reservations/{id}` |
| Reschedule | `PATCH /reservations/{id}/reschedule` |
| Cancel | `PATCH /reservations/{id}/cancel` |
| Operator reservation review + approve/reject | `PATCH .../approve`, `.../reject` |
| Transfer completion view (prosumer sees a completed booking) | `GET /reservations/{id}` |

> **The summary screen is worth 2 marks on its own.** The marking scheme asks
> for a summary page after *every* action — create, update, cancel. One reusable
> screen that takes the response of the call you just made covers all three.

### Also yours

The **web layout shell and navigation** (sidebar, header, role-aware menu),
`routes.tsx`, and the `components/ui` kit everyone uses.
**Build the shared components first** — three people are waiting on them.

### Assisted booking (now built)

Earlier versions said "create reservation" on the web could not exist. The API now
lets a **GridOperator** book, edit and reschedule on a prosumer's behalf, so the web
has `/reservations/new` (operator), and Edit energy / Move to another slot on the
details page. Prosumers still book on mobile only.

### Deliberately cut

**"Edit reservation" as its own screen.** `PUT /reservations/{id}` only changes
`energyKwh`, so make it an inline edit on Booking Details instead of a route.

### Do NOT build

Station list or map · Slot generation or management · Slot selection UI ·
QR display · QR scanner · Login or registration

---

## 5. Member 2 — Identity, accounts and app shell

**Web:** `web/src/pages/users/`, `web/src/pages/prosumers/`,
`web/src/services/userService.ts` (exists), `prosumerService.ts`
**Mobile:** `com.solargridx.mobile.identity`, `api/ProsumerApi.kt`,
`res/navigation/nav_identity.xml`

### Web screens

| Screen | Endpoint |
|---|---|
| User list | `GET /users` |
| Create user (exists — finish it) | `POST /users` |
| Edit user — **send the full object** | `PUT /users/{id}` |
| Delete user | `DELETE /users/{id}` |
| Prosumer list + status filter | `GET /prosumers?status=` |
| **Pending activation queue** (scored) | `GET /prosumers/pending` |
| Prosumer details | `GET /prosumers/{nic}` |
| Edit prosumer — **`email` is required** | `PUT /prosumers/{nic}` |
| Activate / Deactivate | `PATCH /prosumers/{nic}/activate`, `/deactivate` |

### Mobile screens

| Screen | Endpoint |
|---|---|
| Pending account screen | login response `status` |
| Profile | `GET /prosumers/{nic}` |
| Edit profile | `PUT /prosumers/{nic}` |
| Self-deactivate | `PATCH /prosumers/{nic}/deactivate` |
| Account status (role, status badge, member since) | `GET /prosumers/{nic}` |

### Also yours — the app shell

- **Bottom navigation**, different per role:
  - Prosumer: Home · Stations · Bookings · Profile
  - Operator: Home · Reservations · Scan · Profile
- **Role-based routing after login.** Today every role lands on reservations.
- `MainActivity`, `nav_graph.xml`, `AuthContext.tsx`

Splash, login, registration, change-password and logout are **already built** on
both clients. Don't rebuild them.

### Do NOT build

Reservations · Stations · Slots · QR anything

---

## 6. Member 3 — Stations, maps and QR verification

**Web:** `web/src/pages/stations/`, `web/src/services/stationService.ts`
**Mobile:** `com.solargridx.mobile.stations`, `api/StationApi.kt`,
`api/QrVerificationApi.kt`, `res/navigation/nav_stations.xml`

### Start today: Google Maps

The Maps SDK is **not installed** on either client. It needs a Google Cloud
project, the Maps SDK enabled, an API key restricted by package name and SHA-1,
and possibly billing. **That can stall on Google, not on you** — and the map is
worth 5 marks. Do it first, before any screens.

Get the debug SHA-1 with:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Web screens

| Screen | Endpoint |
|---|---|
| Station list + search | `GET /stations` |
| Create station + **map location picker** | `POST /stations` |
| Station details | `GET /stations/{id}` |
| Edit station | `PUT /stations/{id}` |
| Schedule management | `PATCH /stations/{id}/schedule` |
| Activate | `PATCH /stations/{id}/activate` |
| Deactivate + **409 blocking-reservations dialog** | `PATCH /stations/{id}/deactivate` |
| Station map overview | `GET /stations` |

### Mobile screens

| Screen | Endpoint |
|---|---|
| Nearby stations — map + list toggle | `GET /stations/nearby?lat=&lng=&radiusKm=` |
| Station details → hands off to M4's slot list | `GET /stations/{id}` |
| **QR scanner** (ZXing — also not installed) | camera |
| Verification result — success | `POST /qr/verify` |
| Verification result — failure (**one screen**, text from the error code) | `POST /qr/verify` |

`POST /qr/verify` is what moves a reservation to `Completed`. There is no
separate "complete" endpoint. The failure codes you must handle:
`QR_TOKEN_MALFORMED`, `QR_SIGNATURE_INVALID`, `QR_TOKEN_EXPIRED`,
`QR_TOKEN_ALREADY_USED`, `QR_STATION_MISMATCH`.

### Do NOT build

Reservation create/approve · Slot generation or selection · QR display ·
Login

---

## 7. Member 4 — Slots and QR issuance

**Web:** `web/src/pages/slots/`, `web/src/services/slotService.ts`
**Mobile:** `com.solargridx.mobile.slots`, `api/SlotApi.kt`, `api/QrIssueApi.kt`,
`res/navigation/nav_slots.xml`

### Web screens

| Screen | Endpoint |
|---|---|
| Slot management + **station picker** + date | `GET /stations/{id}/slots` |
| Generate a day of slots | `POST /stations/{id}/slots/generate` |
| Create one slot manually | `POST /stations/{id}/slots` |
| Edit slot | `PUT /slots/{id}` |
| Toggle availability | `PATCH /slots/{id}/availability` |
| Bulk availability (checkbox grid) | `PATCH /slots/bulk-availability` |
| Delete slot + **409 when reserved** | `DELETE /slots/{id}` |

### Mobile screens

| Screen | Endpoint |
|---|---|
| Available slots for a station and date | `GET /stations/{id}/slots` or `GET /slots?date=&available=` |
| Slot selection → hands off to M1's energy input | — |
| QR display with a generated QR image (ZXing) | `GET /qr/{reservationId}` |
| **Operator slot update** — toggle a slot offline from the phone | `PATCH /slots/{id}/availability` |
| QR status — Valid / Expired / Used (**one screen**) | same response |

All slot write endpoints are **GridOperator only**. A Backoffice token gets
`403`. Slot management lives under the operator, not the admin.

### Do NOT build

Reservation create or approve · Station CRUD or map · QR scanner or
verification · Login

---

## 8. Gotchas — read these, they will cost you time

**1. Login is email only.** Not NIC, not username. `POST /auth/login` takes
`{ email, password }`.

**2. `capacityKwh` is the maximum energy for ONE booking, not a pool.**
Negombo is 120 kWh over 4 bays, so each slot shows 30 kWh and up to four people
can each book up to 30 kWh. `reservedCount` is a **count of bays**, not energy.

```
Correct:   Up to 30 kWh per booking · 2 of 4 bays reserved
Wrong:     Capacity 30 kWh · Reserved 18 kWh   <- that number does not exist
```

**3. Booking requires `energyKwh`.** The prosumer must enter it before
confirming, or `POST /reservations` fails validation.

**4. Operators are not assigned to a station.** There is no station field on
`User`. Every operator screen needs a **station picker**.

**5. A deactivated user cannot log in**, so there is no "deactivated account"
screen after login — they get `403 ACCOUNT_NOT_ACTIVE` at the login call. Show it
as an error on the login screen. A **Pending** prosumer *can* log in, which is
why the pending screen exists.

**6. `PUT` needs the whole object.** `PUT /users/{id}` requires `role` and
`status`; `PUT /prosumers/{nic}` requires `email`. Send a partial object and you
get a `400`.

**7. `Pending` and `Approved` reservations can be changed; only `Pending` can be decided.** Update and
reschedule work on both (an approved one goes back to `Pending` and loses its QR code). Approve and
reject return `409` once decided. Cancel works on `Pending` and `Approved`. Send `expectedUpdatedAt`
with an edit to be told (`409 *_CHANGED`) if someone else changed the record first.

**8. Every error has the same shape** — build one component for it:

```json
{ "code": "RESERVATION_WINDOW_EXCEEDED",
  "message": "Reservations must be scheduled within 7 days.",
  "details": ["reservationDate: 2026-10-15 is 12 days from today"] }
```

Show `message`, and `details` underneath when present.

**9. Client rules are enforced at login.** Backoffice on web only, Prosumer on
mobile only, Grid Operator on both. The clients already send
`X-Client-Type`, so you get `403 ROLE_NOT_ALLOWED_ON_CLIENT` automatically.

---

## 9. The journey, and where the handoffs are

```
M2  user becomes Active
        ↓
M3  station exists
        ↓
M4  slots generated
        ↓
M3  prosumer browses stations  →  M4  picks a slot  →  M1  enters energy, books
        ↓
M1  operator approves            →  M4  QR issued, prosumer displays it
        ↓
M3  operator scans  →  verified  →  Completed
```

Three handoffs to agree between yourselves:

- **M3 → M4**: station details "View Slots" passes `stationId`
- **M4 → M1**: slot selection passes `stationId`, `slotId`, `slotDate`,
  `startTime`, `endTime`, `capacityKwh`
- **M1 → M4**: an approved reservation passes `reservationId` to the QR screen

