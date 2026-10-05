# Testing and CI/CD

Three test suites, one per codebase, and two GitHub Actions workflows that run them.

| Suite | Where | Runs with | What it covers |
|---|---|---|---|
| API integration | `tests/MicrogridApi.Tests/` | xUnit + `WebApplicationFactory` against a real MongoDB | Reservation rules, lifecycle, role checks, dashboards, booking monitor, paged views, assisted booking, QR preview, password recovery, sessions, profile and photo, notifications, audit, search, CSV export, rate limiting, correlation ids, concurrent booking / approval / scan races, overlap, QR timing, edit conflicts, per-day station hours (128 tests) |
| Web unit | `web/src/**/*.test.ts(x)` | Vitest + React Testing Library (jsdom) | API client, hooks, UI kit, route guard, reservation components, the Users / Prosumers / Stations / Slots rules and pages, password pages, notification bell, per-day hours editor, change dialogs, helpers (162 tests) |
| Mobile unit | `mobile/app/src/test/` | JUnit 4 (no extra dependencies) | Formatters, search, home charts, progress maths, status styles, DTO JSON, station distance and sorting, QR state and refusal mapping, inbox rules, photo checks, per-day hours, edit-version JSON (75 tests) |

## Running locally

### API

The tests need a MongoDB they can create databases in. Each run makes a database named
`SolarGridX_Test_<guid>` and drops it at the end, so it never touches your working data.

```powershell
docker compose up -d mongo
$env:MICROGRID_TEST_MONGO = "mongodb://<user>:<password>@localhost:27017/?authSource=admin"
dotnet test tests/MicrogridApi.Tests
```

Use the `MONGO_ROOT_USERNAME` / `MONGO_ROOT_PASSWORD` from your `.env`. Without
`MICROGRID_TEST_MONGO` every API test is reported as **skipped**, not failed.

### Web

```powershell
cd web
npm test            # once
npm run test:watch  # re-runs on save
```

### Mobile

```powershell
cd mobile
.\gradlew.bat :app:testDebugUnitTest
```

The HTML report is written to `mobile/app/build/reports/tests/testDebugUnitTest/index.html`.

## CI (`.github/workflows/ci.yml`)

Runs on every pull request and every push to `dev`, `develop` and `main`. Three jobs run in parallel:

- **api**: starts a `mongo:8` service container, builds, runs the integration tests.
- **web**: `npm ci`, lint, typecheck, tests, production build.
- **mobile**: installs Android SDK 37, runs the unit tests, assembles the debug APK.

Test results and the mobile HTML report are attached to each run as artifacts.

## CD (`.github/workflows/cd.yml`)

Runs after CI passes on `main` (or by hand from the Actions tab):

- Builds `api/Dockerfile` and `web/Dockerfile` and pushes them to the GitHub Container Registry as
  `ghcr.io/<owner>/<repo>-api` and `-web`, tagged `latest` and with the short commit SHA.
- Builds the debug APK and attaches it to the run.

It uses only the built-in `GITHUB_TOKEN`. Runtime settings (Mongo connection, JWT and QR secrets,
SMTP, seed admin) are passed as environment variables when the containers are started, exactly as in
`docker-compose.yml`, and are never baked into an image. Set the repository variable
`VITE_API_BASE_URL` so the web image points at the deployed API.

## Adding tests

- **API**: add a class with `[Collection(ApiCollection.Name)]` and `[MongoFact]` methods. Seed what you
  need through `ApiFixture` (`SeedProsumerAsync`, `SeedStationAsync`, `SeedSlotAsync`,
  `SeedReservationAsync`) and sign in with `ClientForAsync`. Give every test its own data; never rely on
  another test's records.
- **Web**: put `name.test.ts(x)` next to the file it tests. Shared builders live in `src/test/fixtures.ts`.
- **Mobile**: anything that needs a `Context` or a `View` cannot run as a local unit test. Keep logic in
  plain Kotlin objects (as `Formatters` and `HomeInsights` are) so it can be tested.
