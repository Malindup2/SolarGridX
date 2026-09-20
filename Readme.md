# SE4040 — Enterprise Application Development
## Smart Solar Microgrid Trading System
**Client–Server Application (Web, Mobile and Web Service)**

BSc (Hons) in Information Technology Specialised in Software Engineering
Sri Lanka Institute of Information Technology — Year 4, Semester 2, 2026

| | |
|---|---|
| **Module** | SE4040 — Enterprise Application Development |
| **Assignment** | Assignment 1 — Group Project |
| **Group** | *(group ID)* |
| **Submission deadline** | 30 September 2026, 11:59 PM |
| **Repository** | *(GitHub URL)* |
| **Demo video** | *(YouTube / OneDrive link — max 5 minutes)* |

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Features](#4-features)
5. [Prerequisites](#5-prerequisites)
6. [Repository Structure](#6-repository-structure)
7. [Setup and Installation](#7-setup-and-installation)
8. [Deployment to IIS](#8-deployment-to-iis)
9. [Database Design](#9-database-design)
10. [API Reference](#10-api-reference)
11. [Business Rules](#11-business-rules)
12. [Branching Strategy](#12-branching-strategy)
13. [Team and Individual Contributions](#13-team-and-individual-contributions)
14. [Testing](#14-testing)
15. [Troubleshooting](#15-troubleshooting)
16. [References](#16-references)

---

## 1. Project Overview

The Smart Solar Microgrid Trading System is an end-to-end enterprise application that allows property owners with solar panel arrays (**prosumers**) to trade surplus energy through community microgrid nodes.

The system is built on a client–server architecture with a single centralised web service. Three user roles interact with the platform:

| Role | Access | Responsibilities |
|---|---|---|
| **Backoffice** | Web application | System administration, prosumer account management, account reactivation, microgrid node registration |
| **Grid Operator** | Web + mobile | Battery slot availability, booking monitoring, on-site QR verification and energy transfer finalisation |
| **Solar Prosumer** | Mobile application | Registration, energy slot reservations, booking history, QR-based energy dispatch |

A prosumer reserves an energy transfer slot at a microgrid node from the mobile application. Once a Grid Operator approves the reservation, the system issues a secure transaction QR code. At the node, the operator scans the QR code, the server verifies it against the stored reservation, and the energy transfer is finalised.

---

## 2. System Architecture

```
        ┌──────────────────────┐
        │   Android Mobile App │
        │   (Java / Kotlin)    │
        │   ┌──────────────┐   │
        │   │ SQLite (local│   │
        │   │  session +   │   │
        │   │  cache only) │   │
        │   └──────────────┘   │
        └──────────┬───────────┘
                   │  REST / JSON over HTTPS
                   │  (JWT Bearer)
                   ▼
        ┌──────────────────────────────┐        ┌──────────────┐
        │   C# ASP.NET Core Web API    │◄──────►│   MongoDB    │
        │   Hosted on Windows IIS      │        │  (4 colls.)  │
        │   FAT Service — ALL business │        └──────────────┘
        │   logic resides here         │
        └──────────▲───────────────────┘
                   │  REST / JSON over HTTPS
                   │
        ┌──────────┴───────────┐
        │   React Web App      │
        │   (UI layer only —   │
        │    no local database)│
        └──────────────────────┘
```

### Architectural principles

- **FAT Service pattern.** Every business rule, validation and state transition is executed inside the Web API. Neither client evaluates a business rule locally.
- **Clients are UI layers.** The web application holds no database. The Android application uses SQLite strictly for session persistence and reference-data caching — never as a source of truth.
- **No direct database access from clients.** Neither client opens a MongoDB connection. All data flows through REST endpoints.
- **Single source of truth.** MongoDB holds all persistent domain data. SQLite is a cache that can be cleared at any time without data loss.

---

## 3. Technology Stack

### Web Service (Backend)

| Component | Technology | Version |
|---|---|---|
| Runtime | .NET (LTS) | 10.0 |
| Language | C# | 14 |
| Framework | ASP.NET Core Web API (controller-based) | 10.0 |
| Database | MongoDB | 8.x |
| Driver | MongoDB.Driver | 3.x |
| Authentication | JWT Bearer (`Microsoft.AspNetCore.Authentication.JwtBearer`) | — |
| Password hashing | BCrypt.Net-Next | — |
| Validation | FluentValidation | — |
| API documentation | Swashbuckle (Swagger / OpenAPI) | — |
| Host | Windows IIS 10 | — |

### Web Application (Frontend)

| Component | Technology | Version |
|---|---|---|
| Library | React | 19 |
| Build tool | Vite | 6.x |
| Styling | Tailwind CSS | v4 |
| Routing | React Router | v7 |
| HTTP client | Axios (with JWT interceptor) | — |
| State | React Context API | — |

### Mobile Application

| Component | Technology | Version |
|---|---|---|
| Platform | Pure native Android (no cross-platform frameworks) | — |
| Language | Java / Kotlin | — |
| IDE | Android Studio | Latest stable |
| `compileSdk` / `targetSdk` | Android 16 | API 36 |
| `minSdk` | Android 7.0 | API 24 |
| Local database | SQLite (`SQLiteOpenHelper`) | — |
| Networking | Retrofit 2 + Gson | — |
| QR scanning | ZXing Android Embedded | — |
| QR generation | ZXing Core | — |
| Maps | Google Maps SDK for Android + Play Services Location | — |
| UI | XML layouts, Material Components, ViewBinding | — |

> **Note on "no frameworks."** The assignment prohibits *cross-platform* frameworks (Flutter, React Native, Xamarin, MAUI, Ionic). The application is pure native Android. Retrofit and ZXing are native Android libraries, not cross-platform frameworks, and are used to satisfy the QR and networking requirements of the marking scheme.

---

## 4. Features

### 4.1 Web Application

**User Management**
- Create, update and delete web application users with two roles: Backoffice and Grid Operator
- Role-based login with redirect to the correct home page
- Backoffice-only access to system administration functions

**Prosumer Management**
- Create, update and deactivate prosumer profiles using **NIC as the primary key**
- Deactivated accounts can only be reactivated by a Backoffice officer
- Pending-activation queue showing prosumers awaiting approval

**Microgrid Node Management**
- Register solar grid hubs with GPS location, capacity specification (kW/h) and available battery storage slots
- Update operational schedules
- Node deactivation is blocked when active energy reservations exist

**Energy Slot Reservation Management**
- Create, update, reschedule and cancel power trading reservations
- 7-day scheduling window enforced
- 12-hour minimum notice enforced on updates and cancellations
- Approve / reject workflow for Grid Operators

**Operational Views**
- Booking monitor with filter criteria
- Booking history
- Operator dashboard with pending reservations and count of approved future reservations

### 4.2 Mobile Application

**Prosumer Account Control**
- Registration using NIC as the primary key
- Profile editing
- Self-service account deactivation request

**Reservation and QR Dispatch**
- Reserve, modify and cancel energy drop-off / charging slots
- Summary screen displayed after every action
- Secure transaction QR code generated once a reservation is approved

**Dashboard and Maps**
- Active and pending reservation counts
- Count of approved future reservations
- Booking history, pending bookings and booking search
- Nearby grid nodes plotted via Google Maps API from stored latitude and longitude, with station details on selection

**Operator Mode**
- Grid Operator login routing to a distinct home screen
- QR code scanning
- Server-side verification of scanned codes
- Finalisation of energy transfer business logic

---

## 5. Prerequisites

Install the following before running the project.

### All developers
- **Git** 2.40+
- **MongoDB** 8.x — local installation or MongoDB Atlas free tier (M0)
- **MongoDB Compass** (optional, for inspecting collections)
- **Postman** (for API testing — a shared collection is included in `docs/postman/`)

### Backend
- **.NET 10 SDK**
- **Visual Studio 2026** (or VS Code with the C# Dev Kit extension)

### Web
- **Node.js** 20 LTS or later
- **npm** 10+

### Mobile
- **Android Studio** (latest stable)
- **Android SDK Platform 36**
- **JDK 17**
- An emulator or physical device running Android 7.0 (API 24) or higher
- **Google Maps API key** with the Maps SDK for Android enabled

### Deployment host (one machine only)
- **Windows 10/11 Pro** or Windows Server with IIS enabled
- **ASP.NET Core 10 Hosting Bundle**

---

## 6. Repository Structure

```
SE4040-SmartSolarMicrogrid/
│
├── api/                                  # C# ASP.NET Core Web API
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   ├── ReservationController.cs
│   │   ├── UserController.cs
│   │   ├── ProsumerController.cs
│   │   ├── StationController.cs
│   │   ├── QrVerificationController.cs
│   │   ├── SlotController.cs
│   │   └── QrIssueController.cs
│   ├── Services/                         # Business logic (FAT service layer)
│   ├── Repositories/                     # MongoDB data access
│   ├── Models/                           # Domain models — shared, frozen
│   ├── DTOs/                             # Request / response contracts
│   ├── Middleware/                       # Global error handler, JWT
│   ├── Configuration/                    # MongoDbContext, settings
│   ├── Validators/                       # FluentValidation rules
│   ├── appsettings.json
│   ├── appsettings.Example.json          # Template — copy to .Development.json
│   └── Program.cs                        # Shared, frozen
│
├── web/                                  # React web application
│   ├── src/
│   │   ├── components/                   # Shared component library
│   │   ├── pages/
│   │   ├── services/                     # Axios API wrapper
│   │   ├── context/                      # Auth context
│   │   ├── layouts/
│   │   ├── routes.jsx                    # Shared, frozen
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── mobile/                               # Pure native Android application
│   ├── app/src/main/
│   │   ├── java/com/sliit/microgrid/
│   │   │   ├── activities/
│   │   │   ├── adapters/
│   │   │   ├── api/                      # Retrofit client — shared, frozen
│   │   │   ├── database/                 # SQLiteOpenHelper — shared, frozen
│   │   │   ├── models/
│   │   │   └── utils/
│   │   ├── res/
│   │   └── AndroidManifest.xml           # Shared, frozen
│   ├── build.gradle                      # Shared, frozen
│   └── local.properties.example
│
├── docs/
│   ├── diagrams/                         # High-level, use case, DFD
│   ├── screenshots/
│   ├── postman/
│   └── report/
│
├── .gitignore
└── README.md
```

### Frozen files

The following files are created once during project scaffolding and are modified **only via pull request**. They are shared by all four members and are the main source of merge conflicts if edited directly.

| File | Reason |
|---|---|
| `api/Program.cs` | All service registrations and middleware |
| `api/Configuration/MongoDbContext.cs` | Shared database connection |
| `api/Models/*` | Shared domain models |
| `mobile/AndroidManifest.xml` | All activity declarations |
| `mobile/build.gradle` | All dependencies |
| `mobile/.../api/ApiClient.java` | Retrofit configuration |
| `mobile/.../database/DbHelper.java` | SQLite schema |
| `web/src/routes.jsx` | All application routes |
| `web/src/layouts/*` | Navigation shell |

---

## 7. Setup and Installation

### 7.1 Clone the repository

```bash
git clone <repository-url>
cd SE4040-SmartSolarMicrogrid
```

### 7.2 MongoDB

**Option A — MongoDB Atlas (recommended for team development)**
1. Create a free M0 cluster at <https://cloud.mongodb.com>
2. Create a database user and note the credentials
3. Add your IP address to the network access list (or `0.0.0.0/0` for development)
4. Copy the connection string

**Option B — Local MongoDB**
1. Install MongoDB Community Server 8.x
2. Start the service: `mongod --dbpath <data-path>`
3. Connection string: `mongodb://localhost:27017`

Create the database `SmartMicrogridDb`. The application creates the four collections automatically on first write, or you can seed them with `docs/seed/seed.js`.

### 7.3 Web Service (API)

```bash
cd api
cp appsettings.Example.json appsettings.Development.json
```

Edit `appsettings.Development.json`:

```json
{
  "MongoDbSettings": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "SmartMicrogridDb"
  },
  "JwtSettings": {
    "Secret": "<a-long-random-secret-at-least-32-characters>",
    "Issuer": "SmartMicrogridApi",
    "Audience": "SmartMicrogridClients",
    "ExpiryMinutes": 120
  },
  "Cors": {
    "AllowedOrigins": [ "http://localhost:5173" ]
  }
}
```

Restore, build and run:

```bash
dotnet restore
dotnet build
dotnet run
```

The API starts on `https://localhost:7001` (HTTPS) and `http://localhost:5001` (HTTP).
Swagger UI is available at `https://localhost:7001/swagger`.

### 7.4 Web Application

```bash
cd web
npm install
cp .env.example .env
```

Edit `.env`:

```
VITE_API_BASE_URL=https://localhost:7001/api
```

Run the development server:

```bash
npm run dev
```

The application is served at `http://localhost:5173`.

Production build:

```bash
npm run build
```

### 7.5 Mobile Application

1. Open Android Studio and select **Open**, then choose the `mobile/` folder (not the repository root).
2. Copy `local.properties.example` to `local.properties` and add:

```properties
sdk.dir=C\:\\Users\\<user>\\AppData\\Local\\Android\\Sdk
MAPS_API_KEY=<your-google-maps-api-key>
API_BASE_URL="http://10.0.2.2:5001/api/"
```

3. Let Gradle sync, then run on an emulator or device.

> **Base URL note.** `10.0.2.2` is the Android emulator's alias for the host machine's `localhost`. On a physical device, use the host machine's LAN IP (for example `http://192.168.1.10:5001/api/`) and ensure both devices are on the same network. For cleartext HTTP during development, `android:usesCleartextTraffic="true"` is set in the manifest.

### 7.6 Google Maps API key

1. Open <https://console.cloud.google.com> and create a project
2. Enable **Maps SDK for Android**
3. Create an API key and restrict it by Android package name and SHA-1 fingerprint
4. Retrieve the debug SHA-1 with:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

---

## 8. Deployment to IIS

Deployment is performed on a single Windows host.

### 8.1 Prepare the host

1. Open **Windows Features** and enable **Internet Information Services**, including *Web Management Tools* and *World Wide Web Services → Application Development Features*.
2. Download and install the **ASP.NET Core 10 Hosting Bundle** from the .NET website. This installs the ASP.NET Core Module (ANCM) into IIS.
3. Restart IIS:

```powershell
net stop was /y
net start w3svc
```

### 8.2 Publish the API

```bash
cd api
dotnet publish -c Release -o ./publish
```

Copy the contents of `api/publish/` to `C:\inetpub\wwwroot\MicrogridApi\`.

### 8.3 Configure IIS

1. Open **IIS Manager**.
2. Under **Application Pools**, create a pool named `MicrogridApiPool` with **.NET CLR version: No Managed Code** and **Managed pipeline mode: Integrated**.
3. Under **Sites**, add a website named `MicrogridApi`, physical path `C:\inetpub\wwwroot\MicrogridApi`, application pool `MicrogridApiPool`, port `8080`.
4. Grant `IIS_IUSRS` read and execute permissions on the physical path.
5. Add `appsettings.Production.json` with the production MongoDB connection string and JWT secret.
6. Allow port 8080 through Windows Firewall so mobile devices on the LAN can reach the service:

```powershell
New-NetFirewallRule -DisplayName "Microgrid API" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

### 8.4 Verify

- On the host: `http://localhost:8080/swagger`
- From another device on the network: `http://<host-lan-ip>:8080/swagger`

Update the mobile `API_BASE_URL` and the web `VITE_API_BASE_URL` to the deployed address.

---

## 9. Database Design

MongoDB database: **`SmartMicrogridDb`** — four collections.

### 9.1 `Users`

Holds both web application users (Backoffice, Grid Operator) and solar prosumers.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | System identifier |
| `nic` | string | **Primary key for prosumers** — unique index |
| `username` | string | Unique for web users |
| `passwordHash` | string | BCrypt |
| `fullName` | string | |
| `email` | string | **Login credential** — required, unique, stored lowercase |
| `phone` | string | |
| `address` | string | |
| `role` | string | `Backoffice` \| `GridOperator` \| `Prosumer` |
| `status` | string | `Pending` \| `Active` \| `Deactivated` |
| `createdAt` | DateTime | UTC |
| `updatedAt` | DateTime | UTC |

### 9.2 `SolarStationInfo`

Microgrid nodes (solar grid hubs).

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `stationName` | string | |
| `location` | string | Human-readable address |
| `latitude` | double | For map plotting |
| `longitude` | double | For map plotting |
| `capacityKwh` | double | Capacity specification |
| `batterySlotCount` | int | Available battery storage slots |
| `type` | string | `AC` \| `DC` |
| `operationalSchedule` | object | `openTime`, `closeTime`, `activeDays[]` |
| `status` | string | `Active` \| `Inactive` |
| `createdAt` / `updatedAt` | DateTime | UTC |

### 9.3 `EnergyBookingSlots`

Time slots generated against a station's schedule and capacity.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `stationId` | ObjectId | → `SolarStationInfo._id` |
| `slotDate` | DateTime | |
| `startTime` | string | `HH:mm` |
| `endTime` | string | `HH:mm` |
| `capacityKwh` | double | |
| `isAvailable` | bool | |
| `reservedCount` | int | Against `batterySlotCount` |
| `createdAt` / `updatedAt` | DateTime | UTC |

### 9.4 `EnergyReservation`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `nic` | string | → `Users.nic` |
| `stationId` | ObjectId | → `SolarStationInfo._id` |
| `slotId` | ObjectId | → `EnergyBookingSlots._id` |
| `reservationDate` | DateTime | Must be within 7 days of creation |
| `startTime` / `endTime` | string | `HH:mm` |
| `energyKwh` | double | |
| `status` | string | `Pending` \| `Approved` \| `Rejected` \| `Completed` \| `Cancelled` |
| `qrToken` | string | Issued on approval, HMAC-signed |
| `approvedBy` | string | Operator username |
| `rejectionReason` | string | |
| `completedAt` | DateTime | Set on QR verification |
| `createdAt` / `updatedAt` | DateTime | UTC |

### 9.5 Relationships

```
Users (nic) ──────────────┐
                          │
SolarStationInfo (_id) ───┼──► EnergyReservation
        │                 │
        └──► EnergyBookingSlots (_id) ──┘
```

References are document references, not relational foreign keys. Referential consistency is enforced in the service layer.

---

## 10. API Reference

**Base URL:** `/api`
**Authentication:** `Authorization: Bearer <token>` on all endpoints except `/auth/login` and `/auth/register`
**Content type:** `application/json`
**Timestamps:** ISO-8601, UTC

### 10.1 Error envelope

Every error response has the same shape. Failures are handled in two tiers:

- **Expected failures** — validation errors, wrong credentials, duplicates, business-rule violations — are **returned, not thrown**. A service returns a `Result` / `Result<T>` carrying an `Error` (code, message, type), and `ApiControllerBase` maps the error type to the HTTP status. New services and controllers must follow this pattern; do not throw exceptions for anything a client can cause.
- **Unexpected failures** — a database outage, a bug — are exceptions, caught by one global exception handler that logs them and returns `503` or `500` with a `traceId` in `details` so the log entry can be found.

```json
{
  "code": "RESERVATION_WINDOW_EXCEEDED",
  "message": "Reservations must be scheduled within 7 days.",
  "details": ["reservationDate: 2026-10-15 is 12 days from today"]
}
```

| Status | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Validation failure |
| 401 | Missing or invalid token |
| 403 | Role not permitted |
| 404 | Resource not found |
| 409 | Business rule conflict (e.g. node deactivation blocked) |
| 500 | Unexpected server error (see `traceId` in `details`) |
| 503 | A dependency such as the database is unavailable |

### 10.2 Authentication

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticate; returns token, role and home route |
| `POST` | `/auth/register` | Public | Prosumer self-registration with NIC; status `Pending` |
| `POST` | `/auth/logout` | Any | Invalidate token |

> **UI implications.** Every role logs in with `email` and `password`; the NIC is not a login credential (it identifies prosumers at registration and in reservations). `email` is required and unique, and is compared lowercase. Backoffice and Grid Operator accounts are created by an existing Backoffice user via `POST /users`, which must also supply a unique email — they are never self-registered. The only self-registration is `POST /auth/register`, which always creates a `Prosumer` with status `Pending`; the request carries no `role` field, so there is no role selector anywhere in the public auth flow.

**`POST /auth/login`**

```json
// Request
{ "email": "a.perera@example.com", "password": "..." }

// Response 200
{
  "token": "eyJhbGciOi...",
  "role": "Prosumer",
  "nic": "199812345678",
  "displayName": "A. Perera",
  "homeRoute": "/prosumer/home"
}
```

### 10.3 Reservations

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/reservations` | Prosumer | Create reservation (7-day rule enforced) |
| `GET` | `/reservations` | All | List with filters `?nic=&status=&stationId=` |
| `GET` | `/reservations/{id}` | All | Reservation detail |
| `PUT` | `/reservations/{id}` | Prosumer | Update (12-hour rule enforced) |
| `PATCH` | `/reservations/{id}/reschedule` | Prosumer | Move to a different slot; revalidates both rules |
| `PATCH` | `/reservations/{id}/approve` | GridOperator | `Pending` → `Approved`; triggers QR issue |
| `PATCH` | `/reservations/{id}/reject` | GridOperator | `Pending` → `Rejected` with reason |
| `PATCH` | `/reservations/{id}/cancel` | Prosumer / Backoffice | Cancel (12-hour rule enforced); releases slot |
| `GET` | `/reservations/validate` | All | Pre-flight rule check `?slotId=&date=` |
| `GET` | `/stations/{id}/has-active-reservations` | Internal | Guard for node deactivation |

**`POST /reservations`**

```json
// Request
{
  "nic": "199812345678",
  "stationId": "6710a2f3e1b2c3d4e5f6a7b8",
  "slotId": "6710a2f3e1b2c3d4e5f6a7c1",
  "reservationDate": "2026-09-12",
  "startTime": "10:00",
  "endTime": "11:00",
  "energyKwh": 12.5
}

// Response 201
{
  "id": "6710a3b4...",
  "status": "Pending",
  "stationName": "Negombo Solar Hub 01",
  "slotTime": "2026-09-12 10:00–11:00",
  "qrEligible": false,
  "createdAt": "2026-09-05T08:14:22Z"
}
```

### 10.4 Users and Prosumers

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/users` | Backoffice | List web application users |
| `POST` | `/users` | Backoffice | Create Backoffice or Grid Operator user |
| `PUT` | `/users/{id}` | Backoffice | Update web user |
| `DELETE` | `/users/{id}` | Backoffice | Delete web user |
| `GET` | `/prosumers` | Backoffice / Operator | List prosumers `?status=` |
| `GET` | `/prosumers/pending` | Backoffice | Pending activation queue |
| `GET` | `/prosumers/{nic}` | All | Profile by NIC |
| `PUT` | `/prosumers/{nic}` | Prosumer / Backoffice | Update profile |
| `PATCH` | `/prosumers/{nic}/activate` | **Backoffice only** | Activate or reactivate |
| `PATCH` | `/prosumers/{nic}/deactivate` | Prosumer / Backoffice | Deactivate account |

### 10.5 Microgrid Nodes

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/stations` | Backoffice | Create node with GPS, capacity, slot count |
| `GET` | `/stations` | All | List all nodes |
| `GET` | `/stations/nearby` | All | Map query `?lat=&lng=&radiusKm=` |
| `GET` | `/stations/{id}` | All | Node detail |
| `PUT` | `/stations/{id}` | Backoffice | Update node |
| `PATCH` | `/stations/{id}/schedule` | Backoffice / Operator | Update operational schedule |
| `PATCH` | `/stations/{id}/activate` | Backoffice | Activate node |
| `PATCH` | `/stations/{id}/deactivate` | Backoffice | **409** if active reservations exist |
| `DELETE` | `/stations/{id}` | Backoffice | Delete node (blocked if slots or reservations exist) |

### 10.6 Booking Slots

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/stations/{id}/slots` | Operator | Create slot |
| `POST` | `/stations/{id}/slots/generate` | Operator | Generate a day of slots from the station schedule |
| `GET` | `/stations/{id}/slots` | All | Slots for a node |
| `GET` | `/slots` | All | Availability query `?date=&available=` |
| `PUT` | `/slots/{id}` | Operator | Update time or capacity (conflict-checked) |
| `PATCH` | `/slots/{id}/availability` | Operator | Toggle availability |
| `PATCH` | `/slots/bulk-availability` | Operator | Bulk offline for maintenance |
| `DELETE` | `/slots/{id}` | Operator | Delete (blocked if reserved) |

### 10.7 QR Code

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/qr/issue/{reservationId}` | System / Operator | Issue signed token for an approved reservation |
| `GET` | `/qr/{reservationId}` | Prosumer | Retrieve existing token |
| `POST` | `/qr/verify` | GridOperator | Verify scanned token and finalise transfer |

**QR token payload** (HMAC-SHA256 signed server-side):

```json
{
  "resId": "6710a3b4...",
  "nic": "199812345678",
  "stationId": "6710a2f3...",
  "issuedAt": "2026-09-11T04:00:00Z",
  "exp": "2026-09-12T11:00:00Z",
  "sig": "b64-hmac-signature"
}
```

**`POST /qr/verify`**

```json
// Request
{ "qrToken": "<base64-token>", "operatorId": "op001", "stationId": "6710a2f3..." }

// Response 200
{
  "valid": true,
  "reservationId": "6710a3b4...",
  "prosumerName": "A. Perera",
  "energyKwh": 12.5,
  "slotTime": "2026-09-12 10:00–11:00",
  "status": "Completed"
}
```

### 10.8 Views and Dashboards

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/bookings/search` | All | Filter `?nic=&status=&stationId=&dateFrom=&dateTo=` |
| `GET` | `/dashboard/prosumer/{nic}` | Prosumer | `activeCount`, `pendingCount`, `approvedFutureCount` |
| `GET` | `/dashboard/operator/{stationId}` | Operator | Pending reservations and approved future count |

---

## 11. Business Rules

All rules are enforced inside the Web API service layer. No client evaluates them locally.

| # | Rule | Enforced in |
|---|---|---|
| **BR-01** | A reservation must be scheduled within **7 days** of the current date | `ReservationService.Create`, `Reschedule` |
| **BR-02** | Updates require at least **12 hours'** notice before the slot start time | `ReservationService.Update`, `Reschedule` |
| **BR-03** | Cancellations require at least **12 hours'** notice before the slot start time | `ReservationService.Cancel` |
| **BR-04** | A microgrid node cannot be deactivated while active reservations exist | `StationService.Deactivate` (409) |
| **BR-05** | A deactivated prosumer account can only be reactivated by a Backoffice officer | `ProsumerService.Activate` (403 for other roles) |
| **BR-06** | NIC is the unique primary key for prosumer accounts | Unique index + `ProsumerService.Create` |
| **BR-07** | A QR code is only issued for reservations in `Approved` status | `QrIssueService.Issue` |
| **BR-08** | A QR token is single-use and expires at the slot end time | `QrVerificationService.Verify` |
| **BR-09** | A slot cannot be deleted or reduced below its reserved count | `SlotService.Update`, `Delete` |
| **BR-10** | Only `Active` prosumers may create reservations | `ReservationService.Create` |

**Status lifecycle**

```
Pending ──► Approved ──► Completed
   │            │
   │            └──► Cancelled
   ├──► Rejected
   └──► Cancelled
```

---

## 12. Branching Strategy

```
main                        # Tagged, submission-ready releases only
└── develop                 # Integration branch — merged every Friday
    ├── feat/m1-reservations
    ├── feat/m2-identity
    ├── feat/m3-stations
    └── feat/m4-slots
```

**Rules**
- Rebase onto `develop` before every merge
- Never merge directly into another member's feature branch
- Frozen files change only by pull request
- `develop` must always build and run — a broken merge blocks all four members
- Commit messages are descriptive and reference the feature area, e.g. `feat(reservations): enforce 12-hour cancellation notice`

**Commit convention**

```
feat(<area>): <what changed>
fix(<area>): <what was broken>
refactor(<area>): <what was restructured>
docs(<area>): <what was documented>
```

---

## 13. Team and Individual Contributions

| Member | IT Number | Component | Branch |
|---|---|---|---|
| *(Name)* | IT23391390 | Reservation lifecycle, dashboards, shared architecture, IIS deployment | `feat/m1-reservations` |
| *(Name)* | *(IT number)* | Identity and account management | `feat/m2-identity` |
| *(Name)* | *(IT number)* | Microgrid nodes, Google Maps, QR verification | `feat/m3-stations` |
| *(Name)* | *(IT number)* | Booking slots, availability engine, QR issuance | `feat/m4-slots` |

### Member 1 — Reservations and Booking Views

**Web service:** `AuthController` (shared Sprint-0), `ReservationController`, `ReservationService`, `DashboardService`, `MongoDbContext`, JWT middleware, global exception handler, FluentValidation rules for BR-01 to BR-03, BR-10.
**Endpoints:** `POST/GET /reservations`, `GET /reservations/{id}`, `PUT /reservations/{id}`, `PATCH /reservations/{id}/reschedule`, `PATCH /reservations/{id}/approve`, `PATCH /reservations/{id}/reject`, `PATCH /reservations/{id}/cancel`, `GET /reservations/validate`, `GET /bookings/search`, `GET /dashboard/prosumer/{nic}`, `GET /dashboard/operator/{stationId}`.
**Web application:** Layout shell and navigation, reservation list, reservation details, create reservation, edit reservation, approve/reject, reschedule, cancel, operator dashboard, prosumer dashboard, completion/summary.
**Mobile application:** Prosumer home, operator home, booking flow, booking confirmation, my bookings, booking details, reschedule, cancel, booking summary, operator reservation review, transfer completion.
**Infrastructure:** Project scaffolding across all three codebases, MongoDB schema design for all four collections, shared component library, IIS deployment and documentation.

> Completion is never a separate client-facing endpoint — a reservation only moves `Approved` → `Completed` as a side effect of Member 3's `POST /qr/verify`, never by a direct call. This keeps the "scan to finalise" requirement from being bypassable.

### Member 2 — Identity and Account Management

**Web service:** `UserController`, `ProsumerController`, `UserService`, `ProsumerService`, NIC uniqueness enforcement, BR-05 and BR-06.
**Endpoints:** `GET/POST /users`, `PUT/DELETE /users/{id}`, `GET /prosumers`, `GET /prosumers/pending`, `GET /prosumers/{nic}`, `PUT /prosumers/{nic}`, `PATCH /prosumers/{nic}/activate`, `PATCH /prosumers/{nic}/deactivate`.
**Web application:** Login, user list, create user, edit user, prosumer list, prosumer details/edit, pending prosumer queue, activate prosumer, deactivate prosumer.
**Mobile application:** Splash, login, registration, pending account, profile, edit profile, account status, logout.
**Signature capability:** Role-based routing across both clients (routes into Member 1's home screens after login), SQLite session persistence on Android.

### Member 3 — Microgrid Nodes, Maps and Operator Verification

**Web service:** `StationController`, `QrVerificationController`, `StationService`, deactivation guard (BR-04), QR verification and expiry (BR-08).
**Endpoints:** `POST/GET /stations`, `GET /stations/nearby`, `GET /stations/{id}`, `PUT /stations/{id}`, `PATCH /stations/{id}/schedule`, `PATCH /stations/{id}/activate`, `PATCH /stations/{id}/deactivate`, `DELETE /stations/{id}`, `POST /qr/verify`.
**Web application:** Station list, create station, edit station, station details, schedule management, activate/deactivate, station map overview.
**Mobile application:** Nearby stations, station map, station list, station details, QR scanner, QR verification result, invalid/expired/used QR states.
**Signature capability:** Google Maps integration on both clients, operator QR verification flow — the only place a reservation is moved to `Completed`.

### Member 4 — Booking Slots and QR Issuance

**Web service:** `SlotController`, `QrIssueController`, `SlotService`, slot generation from station schedule, capacity conflict detection (BR-09), QR issuance (BR-07).
**Endpoints:** `POST /stations/{id}/slots`, `POST /stations/{id}/slots/generate`, `GET /stations/{id}/slots`, `GET /slots`, `PUT /slots/{id}`, `PATCH /slots/{id}/availability`, `PATCH /slots/bulk-availability`, `DELETE /slots/{id}`, `POST /qr/issue/{reservationId}`, `GET /qr/{reservationId}`.
**Web application:** Slot management, slot generation, availability grid, bulk availability, slot edit/update.
**Mobile application:** Slot availability, slot selection, operator slot update, QR display, QR status (valid/expired/used).
**Signature capability:** Slot generation and availability engine, QR code generation.

---

## 14. Testing

### API testing

A Postman collection is provided at `docs/postman/SmartMicrogrid.postman_collection.json` with an environment file for local and deployed base URLs. The collection includes:

- Authentication flow with automatic token capture
- Happy-path requests for every endpoint
- Negative tests for each business rule (8-day booking, 6-hour cancellation, node deactivation with active reservations)

### Manual test scenarios

| Scenario | Expected result |
|---|---|
| Create a reservation 9 days ahead | 400 — BR-01 violation |
| Cancel a reservation 6 hours before start | 400 — BR-03 violation |
| Deactivate a node with an active reservation | 409 with blocking reservation list |
| Reactivate a prosumer as a Grid Operator | 403 — Backoffice only |
| Scan an expired QR token | 400 — token expired |
| Scan the same QR token twice | 400 — token already used |
| Log in as each of the three roles | Correct home screen on both clients |

### Seed data

Run `docs/seed/seed.js` in `mongosh` to create two stations, one day of slots, one Backoffice user, one Grid Operator and three prosumers in mixed states.

---

## 15. Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `HTTP Error 500.19` on IIS | Hosting Bundle not installed | Install the ASP.NET Core 10 Hosting Bundle and restart IIS |
| `HTTP Error 500.30` on IIS | App failed to start | Check `logs/stdout` after enabling `stdoutLogEnabled` in `web.config`; usually a bad connection string |
| Android emulator cannot reach the API | `localhost` resolves to the emulator | Use `10.0.2.2` for the emulator, LAN IP for physical devices |
| `CLEARTEXT communication not permitted` | HTTP blocked by default on API 28+ | Set `android:usesCleartextTraffic="true"` for development, or use HTTPS |
| Map renders grey | Invalid or unrestricted API key | Verify the key, enable Maps SDK for Android, check the SHA-1 restriction |
| CORS error in the browser | Origin not allowed | Add the origin to `Cors.AllowedOrigins` in `appsettings` |
| `MongoAuthenticationException` | Wrong credentials or IP not allowlisted | Check the Atlas user and network access list |
| Gradle sync fails after pull | Frozen `build.gradle` changed | Run **File → Sync Project with Gradle Files** |

---

## 16. References

*(Complete during report writing — the marking scheme requires consistently formatted references.)*

- Microsoft. *ASP.NET Core Web API documentation.* <https://learn.microsoft.com/aspnet/core/web-api>
- Microsoft. *Host ASP.NET Core on Windows with IIS.* <https://learn.microsoft.com/aspnet/core/host-and-deploy/iis>
- MongoDB. *MongoDB C# Driver documentation.* <https://www.mongodb.com/docs/drivers/csharp>
- Android Developers. *Save data using SQLite.* <https://developer.android.com/training/data-storage/sqlite>
- Google. *Maps SDK for Android.* <https://developers.google.com/maps/documentation/android-sdk>
- ZXing. *ZXing Android Embedded.* <https://github.com/journeyapps/zxing-android-embedded>
- Square. *Retrofit.* <https://square.github.io/retrofit>
- Tailwind Labs. *Tailwind CSS documentation.* <https://tailwindcss.com/docs>

> Any code adapted from tutorials or documentation is referenced inline in the source file where it appears, as required by the assignment instructions.

---

## Submission Checklist

- [ ] Comment header block on **every** `.cs` file
- [ ] Inline comments at the beginning of **every** method
- [ ] Unique screenshots of all UIs (web and mobile)
- [ ] High-level diagram, use case diagram and DFD in the report
- [ ] Database design section in the report
- [ ] Source code pasted as text in the report (not screenshots)
- [ ] References complete and consistently formatted
- [ ] Individual contribution section per member
- [ ] Challenges section with genuine reflection
- [ ] Git repository link in both the report and this README
- [ ] Demo video (max 5 minutes) linked in this README
- [ ] Screenshot of the main opening screen included
- [ ] Zip file named with the IT number, e.g. `IT23391390.zip`
- [ ] Submitted before 30 September 2026, 11:59 PM
