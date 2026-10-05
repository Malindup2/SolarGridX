# SolarGridX — System Architecture & Technical Design

This document details the architectural blueprint, layered design, integration boundaries, security protocols, and operational workflows of **SolarGridX**.

---

## 1. System Overview & C4 Architecture

SolarGridX is an enterprise-grade Smart Solar Microgrid Management Platform connecting **Backoffice Administrators**, **Grid Operators**, and **Prosumers** (solar producers/consumers) with real-time slot booking, telemetry, and cryptographic QR check-in capabilities.

```mermaid
graph TD
    subgraph Clients ["Client Layer"]
        WebAdmin["Web Portal (React 19 + TypeScript + Tailwind)<br/>• Backoffice Administrator<br/>• Grid Operator Console"]
        MobileApp["Android App (Kotlin + MVVM + Jetpack)<br/>• Prosumer Mobile App<br/>• Operator QR Scanner"]
    end

    subgraph SecurityGateway ["Security & API Gateway"]
        HTTPS["TLS 1.3 / HTTPS"]
        AuthMiddleware["JWT Validation & RBAC Middleware<br/>• Role Checking (Backoffice, GridOperator, Prosumer)<br/>• SecurityVersion Invalidation Check"]
    end

    subgraph BackendAPI ["Application Layer (.NET 9 Web API)"]
        Controllers["Controllers & Endpoints"]
        Services["Domain Services (Business Logic)<br/>• ReservationService<br/>• StationService<br/>• SlotService<br/>• UserService<br/>• AuditService"]
        Validation["Rules & Invariants Engine<br/>• Overlap Guards<br/>• Deactivation Guards<br/>• Atomic Slot Allocator"]
    end

    subgraph DataLayer ["Data & External Services Layer"]
        MongoAtlas[("MongoDB Atlas<br/>• Documents & Aggregations<br/>• Atomic Operations<br/>• Geospatial & Compound Indexes")]
        GoogleMaps["Google Maps JavaScript & Android SDK"]
        SMTP["SMTP Mailer (Password Recovery / Alerts)"]
    end

    WebAdmin -->|REST / JSON| HTTPS
    MobileApp -->|REST / JSON| HTTPS
    HTTPS --> AuthMiddleware
    AuthMiddleware --> Controllers
    Controllers --> Services
    Services --> Validation
    Validation --> MongoAtlas
    Services --> GoogleMaps
    Services --> SMTP
```

---

## 2. Layered Clean Architecture (.NET 9 API)

The backend follows Clean Architecture principles with explicit separation of concerns:

```
MicrogridApi/
├── Configuration/       # Strongly typed options (MongoDbSettings, JwtSettings, EmailSettings)
├── Controllers/         # REST API Controllers (Auth, Users, Stations, Slots, Reservations, Dashboard)
├── DTOs/                # Request/Response Data Transfer Objects with validation annotations
├── Middleware/          # Global Exception Handler (RFC 7807 ProblemDetails), JWT Auth & Auditing
├── Models/              # MongoDB BSON Domain Entities (User, SolarStationInfo, EnergyReservation, etc.)
├── Services/            # Business Logic & Orchestration (ReservationService, StationService, etc.)
└── Program.cs           # Dependency Injection container, Swagger setup & Seeder pipeline
```

---

## 3. Key Operational Sequence Diagrams

### 3.1 Atomic Solar Slot Reservation & Concurrency Control

```mermaid
sequenceDiagram
    autonumber
    actor Prosumer as Prosumer (Mobile/Web)
    participant API as .NET API (ReservationService)
    participant DB as MongoDB Atlas (Atomic Engine)

    Prosumer->>API: POST /api/v1/reservations (StationId, SlotId, Date, EnergyKwh)
    activate API
    API->>API: Validate Prosumer Status (Active check)
    API->>API: Validate Overlapping Bookings (ExistsOverlappingAsync)
    
    rect rgb(240, 248, 255)
        Note over API,DB: Atomic Update with Filter Guard (No single-point lock bottlenecks)
        API->>DB: UpdateOneAsync(SlotId & IsAvailable & CapacityKwh >= requested, Inc ReservedCount)
        DB-->>API: ModifiedCount = 1 (Success) / 0 (Slot Full)
    end

    alt Slot Full / Concurrently Booked
        API-->>Prosumer: 409 Conflict (SLOT_CAPACITY_EXCEEDED)
    else Slot Reserved Successfully
        API->>API: Generate Cryptographic QR Security Token
        API->>DB: InsertOneAsync(EnergyReservation with Pending status)
        API->>DB: InsertOneAsync(AuditEntry)
        API-->>Prosumer: 201 Created (Reservation DTO + QR Token Payload)
    end
    deactivate API
```

---

### 3.2 QR Code Check-in & Power Transfer Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Prosumer as Prosumer
    actor Operator as Grid Operator
    participant Mobile as Mobile Scanner App
    participant API as .NET API
    participant DB as MongoDB Atlas

    Prosumer->>Operator: Presents Mobile QR Ticket
    Operator->>Mobile: Opens Camera QR Scanner
    Mobile->>Mobile: Scans & extracts (ReservationId, QrToken)
    Mobile->>API: POST /api/v1/reservations/verify-qr { id, token }
    activate API
    API->>DB: Find reservation by ID & QrToken & Status == Approved
    DB-->>API: Reservation Record
    
    alt Invalid or Expired Token
        API-->>Mobile: 400 Bad Request ("Invalid QR token or already completed")
    else Valid Check-in
        API->>DB: Update Status = Completed, CompletedAt = UtcNow, Rotate QrToken = null
        API->>DB: Insert AuditEntry (Action = "QR_VERIFIED_COMPLETED", OperatorId)
        API-->>Mobile: 200 OK (Verification DTO with Prosumer & Energy Details)
        Mobile-->>Operator: Displays Green "Transfer Verified & Completed" Card
    end
    deactivate API
```

---

## 4. Security & Identity Architecture

### 4.1 Token Revocation & `SecurityVersion` Pattern
1. Every user document maintains an integer `SecurityVersion` (initialized to `1`).
2. When a JWT is minted, `sec_v: User.SecurityVersion` is embedded into the claims.
3. On password changes, profile deactivations, or administrative revocations, the backend executes:
   $$\text{User.SecurityVersion} \leftarrow \text{User.SecurityVersion} + 1$$
4. The JWT authentication middleware checks `claim.sec_v == current_user.SecurityVersion`. Any token issued prior to the password change is instantly rejected across all devices without maintaining heavy in-memory sessions.

---

## 5. Client Applications Architecture

### 5.1 Web Client (React 19 + TypeScript)
* **Design System**: Modern high-density dashboard tokens using Tailwind CSS v4.
* **State & Data Fetching**: Custom `useApiQuery` and `useApiMutation` hooks with `AbortController` cancellation support.
* **Component Kit**: Native SVG Donut & Bar Charts, responsive drawers, command palettes (`Ctrl+K`), and Google Maps JS Loader.

### 5.2 Mobile Client (Android Kotlin)
* **Architecture**: Single-Activity Pattern (`MainActivity`) with Jetpack Navigation Graphs (`nav_auth`, `nav_stations`, `nav_reservations`, `nav_scan`).
* **MVVM Pattern**: ViewModels managing live UI states via Kotlin Coroutines and StateFlow.
* **Hardware Integration**: CameraX for real-time QR code decoding, Google Play Services Location for proximity calculations.
