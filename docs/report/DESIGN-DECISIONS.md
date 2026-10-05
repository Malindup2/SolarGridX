# Design decisions, deliberate differences and known limits

For the "challenges" and "design" sections of the report. Each item says what we chose and why.

## Decisions where we differ from the brief or from the reference project

| Topic | What we do | Why |
|---|---|---|
| **Pending prosumers can sign in** | A prosumer who has registered but not been activated can log in; the mobile app shows a "Waiting for activation" screen and the API refuses bookings (BR-10). Deactivated accounts cannot log in. | The brief says the Backoffice activates accounts but not that login must be blocked. Letting them in lets us show the status, send them a clear message and let them re-check, instead of a bare "login failed". The reference blocks login until activation. |
| **No email-verification link** | Activation is the Backoffice's decision (BR-05). The prosumer gets an email when activated or deactivated. | The brief's rule is "Backoffice activates". A verification link adds a second approval step the marking scheme does not ask for. |
| **Operators can book on a prosumer's behalf** | `POST/PUT/PATCH reschedule /reservations` accept GridOperator as well as Prosumer. Every rule still applies (BR-10 to BR-18, BR-31). | Staff need to help a caller who cannot use the app. The audit trail records the operator as the actor. |
| **Approved bookings can be edited** | A change sends the booking back to Pending and clears its QR code (BR-16). | Brief: "modify reservation". Re-approval keeps the operator in control of what they approved. |
| **Only `POST /qr/verify` completes a transfer** | `POST /qr/preview` shows the booking read-only first. There is no separate "complete" endpoint. | A scan cannot be skipped or replayed: the code, the station, the time window and the status are all checked in the one atomic step (BR-27, BR-33, BR-34). |
| **Single API project, `/api`** | Not the reference's layered projects with `/api/v1`. | A structure choice; services and repositories give the same separation for a team this size. |
| **No dark theme** | Light only. | The reference has none either. |

## What we have that the reference does not

Server-side logout with a revoked-token store; forced first-login password change; web/mobile client restrictions at login; slot generation and bulk availability; booking pre-check (`/reservations/validate`) and a separate reschedule endpoint; station reactivate/delete, slot delete, staff delete; AC/DC station type; HMAC-signed QR codes with expiry; per-station and per-prosumer dashboards; per-day station hours; Docker Compose plus a CD workflow; FluentValidation; a Postman collection.

## Concurrency: how we avoid corrupt data

MongoDB (standalone) has no multi-document transactions here, so each rule that must not race is one atomic update:

- Taking a bay: `ReservedCount` is incremented only `where ReservedCount < bays and the slot is online` (BR-34). Eight simultaneous bookings for the last bay produce one booking (a test does exactly this).
- Approve / reject / cancel / edit: the document is replaced only `where updatedAt is still what we read`; the loser gets `RESERVATION_CHANGED`.
- Completion: one update `where status = Approved and the QR token matches`; eight simultaneous scans complete it once.
- Releasing a bay never takes the count below zero.

## Known limits

- Notifications and audit entries are written best-effort. If the write fails it is logged and the action still succeeds, so an entry can occasionally be missing.
- Reservation timing treats a slot that ends at `00:00` as ending at midnight of its own day.
- Auth rate limiting is per client IP. Behind a reverse proxy every user can share an address; configure forwarded headers in front of the API, or raise `RateLimiting:AuthPermitLimit`.
- The mobile app learns a prosumer's activation when they tap "Check again" (or sign in again).
- Google Maps is optional; without a key the station screens use a list and plain latitude/longitude fields.
- Slot length is fixed at one hour.
