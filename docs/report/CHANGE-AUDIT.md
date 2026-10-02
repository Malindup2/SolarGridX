# Change audit: gap closure against the SmartSolar reference

| | |
|---|---|
| **Date** | 2 October 2026 |
| **Project** | SolarGridX (API `api/`, web `web/`, mobile `mobile/`) |
| **Reference compared** | `SmartSolar` (another team's implementation of the same brief, read-only) |
| **Work done for** | Member 1 (IT23391390), on behalf of the whole group at the user's request |
| **Branch** | `backup/gap-closure-and-test-suite-2026-10-02` (forked from `feat/web-ui-kit-and-app-shell` at `703fae0`) |
| **Status** | Built, tested, committed to the backup branch only. Not merged. Not pushed. |

This file records what was changed, why, how each part was checked, what was **not** checked, and the
decisions the user made. It is meant to be read by someone who was not there.

---

## 1. Why this work happened

1. The user asked for the project to be compared with a finished reference implementation and the gaps listed.
2. The comparison found the reference had more endpoints (about 56 against our 47), more working screens (all four
   members' areas merged), automated tests and CI, and several quality features (notifications, audit trail,
   password reset, exports, rate limiting).
3. The user then asked for those gaps to be closed, and for a second pass over the booking-integrity problems the
   comparison exposed. A separate review (pasted by the user) confirmed those problems against the code.

Scope decision (user, via questions): **everything for all members**, backend changes allowed ("cleared with the
group"). Items the user chose to leave out: email-verification link, dark theme, avatar resizing.

## 2. Decisions recorded

| Decision | Choice | Source |
|---|---|---|
| Who builds teammates' areas | Everything, all members | user |
| Backend changes | Free to change anything | user |
| Google Maps | Optional: maps only when a key is set; list and lat/lng fields otherwise | user |
| Email verification | Not added (BR-05 stays: Backoffice activates) | user |
| QR completion | Add a read-only preview step before the completing verify | user |
| Avatars | Include, validation only (JPEG/PNG, up to 1 MB, magic bytes), no resizing | user |
| Dark theme | Dropped (the reference has none) | finding |
| Commits | Only to the backup branch, because the user explicitly asked for it | user |

## 3. What was built

### 3.1 Tests and CI/CD (first round)
- API integration tests (`tests/MicrogridApi.Tests`, xUnit + `WebApplicationFactory`, real MongoDB, skipped when
  `MICROGRID_TEST_MONGO` is not set).
- Web unit tests (Vitest + Testing Library), mobile unit tests (JUnit, no new dependencies).
- `.github/workflows/ci.yml` (API with a `mongo:8` service, web lint/typecheck/test/build, Android unit tests + debug
  APK) and `.github/workflows/cd.yml` (container images to GHCR, debug APK artifact).
- One build break found and fixed on the way: `view_reservation_progress.xml` was missing, so the mobile app did not
  compile before this work.

### 3.2 New API endpoints and behaviour (second round)
| Area | Added |
|---|---|
| Hardening | Correlation id middleware (`X-Correlation-ID`), Mongo health check, auth rate limiting (10/min/IP, 429), session version (`sv` claim) so a password change signs out every other device |
| Activity | `AuditLog` and `Notifications` collections; `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET /audit/{kind}/{id}`; every business action records an entry and notifies who it concerns |
| Accounts | `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET/PUT /users/me`, `POST /users/me/deactivation-request`, avatar `GET/PUT/DELETE /users/me/avatar` and `GET /users/{id}/avatar`; activation/deactivation emails |
| Reservations | `GET /reservations/view/{current|pending|history}` (paged); operators may book/edit/reschedule on a prosumer's behalf |
| QR | `POST /qr/preview` (read-only) |
| Discovery | `GET /search`, `GET /exports/{users|prosumers|stations|reservations}.csv` |

### 3.3 Booking integrity (third round)
| Rule | Change | Proof |
|---|---|---|
| BR-13 / BR-34 | Taking a bay is one atomic update, so the last bay cannot be sold twice | 8 simultaneous bookings produce exactly 1 |
| BR-34 | Completion is one atomic `Approved -> Completed` update | 8 simultaneous scans complete it once |
| BR-34 | Approve / reject / cancel / edit save only if the record is unchanged since it was read | 2 simultaneous approvals: one wins |
| BR-31 | No overlapping live bookings for one prosumer, even in different slots | test, plus back-to-back and cancelled cases |
| BR-32 | A booking cannot be approved after its slot has started (it can still be rejected) | test |
| BR-33 | A QR code does not work before its slot starts (preview and verify) | test |
| BR-16 | Approved bookings can be edited; the booking returns to Pending and the QR is cleared | tests incl. the 12-hour rule |
| BR-35 | Optional `expectedUpdatedAt` on edits; stale saves get `*_CHANGED` (reservations, stations, slots) | tests on all three |
| BR-36 | Per-day station opening hours; slot generation and the schedule-change check use each weekday's hours | tests |

The three safety guards (bay check, completion check) were verified by temporarily removing them and confirming the
tests fail, then restoring them.

### 3.4 Web (`web/`)
Real pages replacing the placeholders and the old mock dashboard: Users, Prosumers (+ activation queue and details),
Stations (+ details, schedule editor with per-day hours, map when a key exists), Slots (generate, add, edit, toggle,
bulk, delete), Profile, Notifications, Forgot/Reset password, New reservation (operator), Edit-energy / Move-slot for
Pending and Approved bookings, booking views with paging, notification bell, Ctrl/Cmd+K search, CSV export buttons,
audit history panels. Maps code came from `origin/feat/m3-frontend-stations` (files copied, branch not merged).

### 3.5 Mobile (`mobile/`)
Stations list with search, nearest-first and an optional map; station details with per-day hours; QR scan
(ZXing) -> preview -> confirm; prosumer QR display; operator slot on/off screen; waiting-for-activation screen;
forgot password; notifications inbox with an unread badge on the Profile tab; profile photo; "Change booking" for
Approved bookings with the re-approval warning; edit version sent with updates.

## 4. Behaviour changes (read before merging)

1. Operators can now create, edit and reschedule reservations for a prosumer. Previously Prosumer-only.
2. Approved bookings can be edited and go back to Pending (BR-16 was "Pending only").
3. `POST /auth/change-password` now returns a fresh `LoginResponse` and signs out other sessions.
4. Login, register, forgot, reset and change-password are rate-limited per IP.
5. `QrVerifyResponse.completedAt` is nullable (null only on a preview).
6. QR codes fail with `409 QR_TOKEN_NOT_YET_VALID` before the slot starts; approval fails with
   `409 RESERVATION_ALREADY_STARTED` after it starts.
7. Overlapping bookings by one prosumer are refused (`409 RESERVATION_OVERLAP`).
8. `SlotResponse` gained `updatedAt`; `StationScheduleResponse` gained `dayHours`.
9. Existing actions now also write audit entries and notifications as a side effect (best effort, never fails the action).
10. Mobile session table gained a `status` column; existing installs sign in once more after updating.
11. Removed: the mock `/dashboard`, and the offline fake-user fallback in the web `createUser`.

`api/Program.cs` is on the "frozen files" list. It was edited (service registration, rate limiter, middleware,
indexes, the `public partial class Program` line for tests). Tell the group.

## 5. Verification

| Check | Result |
|---|---|
| API tests (`dotnet test tests/MicrogridApi.Tests`, real MongoDB) | **128 passed** |
| Web: lint, typecheck, `vitest`, production build | **162 passed**, lint 1 pre-existing warning, build ok |
| Mobile: `testDebugUnitTest`, `assembleDebug` | **75 passed**, APK builds |
| Live API (rebuilt Docker image), curl | per-day hours, book -> approve -> edit-approved -> Pending with QR gone, stale-version refusal, 8 racing bookings = 1 created + 7 refused |
| Emulator (Pixel_8) | login screen with "Forgot password?"; pending prosumer sees the waiting screen; operator home shows the Manage-slots icon; Scan tab opens and asks for camera permission; prosumer Stations tab lists both stations (Map chip shown because a Maps key is set) |
| Concurrency guards | removed temporarily, tests failed, restored |

### Not verified (be honest in the report)
- **Web pages were never opened in a browser.** They are covered by unit tests, typecheck and a build only.
- **Mobile, not exercised on a device:** station details, the map view itself, the QR display, a real QR scan,
  the notifications inbox screen, profile photo upload, the operator slots screen, "Change booking".
- No real SMTP send (reset/activation emails are logged when SMTP is not configured).
- GitHub Actions workflows have never run (nothing has been pushed). The YAML parses.

## 6. Data and security notes

- **Dev database cleanup.** While checking the live API I created two stations ("Live Hours Hub", "Live One Bay"),
  two reservations and ten slots, plus audit/notification rows. All were removed afterwards (counts: 2 stations,
  2 reservations, 10 slots, 10 audit rows, 7 notifications). Seed data was not touched.
- **Unread badge on the Profile tab** is the unread-notification count (`GET /notifications` -> `unreadCount`). It
  showed 2 for the seed prosumer `amal` because of the test booking above; after cleanup it is 0.
- **Secrets.** `mobile/local.properties` contains a Google Maps key. It is git-ignored (`mobile/.gitignore`) and was
  confirmed absent from every file that would be committed. `.env` and `web/.env.local` are also ignored. Rotate the
  Maps key if it was ever shared outside the team, and restrict it by package name and SHA-1.
- A Maps key is optional at runtime; builds and CI do not need one.

## 7. Known gaps and limits (still open)

- Email-verification link: skipped on purpose.
- Notifications and audit entries are best-effort writes; a failure leaves a gap but never fails the action.
- Auth rate limiting is per IP: behind a reverse proxy configure forwarded headers or raise
  `RateLimiting:AuthPermitLimit`.
- Slot length is fixed at one hour; slots crossing midnight are not modelled.
- Layered projects and `/api/v1` versioning were not adopted (structure choice).
- The submission deadline in the Readme (30 Sept 2026) has passed; confirm any extension.

## 8. How to reproduce the checks

```powershell
docker compose up -d mongo
$env:MICROGRID_TEST_MONGO = "mongodb://<user>:<password>@localhost:27017/?authSource=admin"
dotnet test tests/MicrogridApi.Tests
cd web;    npm ci; npm run lint; npm run typecheck; npm test; npm run build
cd mobile; .\gradlew.bat :app:testDebugUnitTest :app:assembleDebug
```

Related documents: `Readme.md` (sections 9 to 11), `docs/TESTING.md`, `docs/FRONTEND-OWNERSHIP.md`,
`docs/report/DESIGN-DECISIONS.md`.
