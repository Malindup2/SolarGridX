# SolarGridX — API Contract & REST Endpoint Specification

This document defines the REST API contract for the SolarGridX Backend API, implemented in ASP.NET Core 9.

**Base URL (Local):** `http://localhost:5187/api`  
**Swagger / OpenAPI Documentation:** `http://localhost:5187/swagger`  
**Authentication Scheme:** `Bearer <JWT_TOKEN>` (HTTP Header: `Authorization: Bearer ...`)

---

## 1. Authentication & Account Recovery (`/auth`)

### 1.1 `POST /auth/login`
Authenticates a user and returns a signed JWT token.
* **Access:** Public
* **Request:**
  ```json
  {
    "email": "operator@solargridx.com",
    "password": "Operator@12345"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-10-03T01:15:00Z",
    "user": {
      "id": "670123456789abcdef012345",
      "email": "operator@solargridx.com",
      "fullName": "Kasun Operator",
      "role": "GridOperator",
      "status": "Active",
      "mustChangePassword": false
    }
  }
  ```

---

### 1.2 `POST /auth/register`
Self-registration for Prosumers.
* **Access:** Public
* **Request:**
  ```json
  {
    "fullName": "Sunil Prosumer",
    "nic": "200012345678",
    "email": "prosumer@solargridx.com",
    "password": "Prosumer@12345",
    "phone": "0771234567",
    "address": "No. 45, Galle Road, Colombo 03"
  }
  ```
* **Response (201 Created):** Prosumer user profile with `status: "Pending"` or `"Active"`.

---

## 2. Solar Stations API (`/stations`)

| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `GET` | `/stations` | All authenticated | Lists all solar stations (supports status and location filters). |
| `GET` | `/stations/{id}` | All authenticated | Returns station details by ID with current capacity and opening hours. |
| `POST` | `/stations` | `Backoffice` | Creates a new solar microgrid station. |
| `PUT` | `/stations/{id}` | `Backoffice` | Updates station metadata, capacity, or location coordinates. |
| `PATCH` | `/stations/{id}/status` | `Backoffice` | Toggles station status (`Active` / `Inactive`). *Guarded against active bookings.* |

---

## 3. Energy Booking Slots API (`/slots`)

| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `GET` | `/slots?stationId={id}&date={YYYY-MM-DD}` | All authenticated | Retrieves 24-hour time slots for a station on a given date. |
| `POST` | `/slots` | `GridOperator`, `Backoffice` | Creates a custom slot or generates daily operating windows. |
| `PUT` | `/slots/{id}` | `GridOperator`, `Backoffice` | Updates slot capacity (kW) or availability. |
| `PATCH` | `/slots/{id}/toggle` | `GridOperator` | Toggles slot availability (`IsAvailable: true/false`). |

---

## 4. Energy Reservations API (`/reservations`)

| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `POST` | `/reservations` | `Prosumer`, `GridOperator` | Books a solar grid slot with atomic capacity decrement. |
| `GET` | `/reservations` | All roles (Scoped) | Lists reservations (Prosumers see own; Operators see station). |
| `GET` | `/reservations/{id}` | All roles | Fetches detailed reservation record with QR payload. |
| `PATCH` | `/reservations/{id}/approve` | `GridOperator`, `Backoffice` | Approves a pending reservation and generates QR security token. |
| `PATCH` | `/reservations/{id}/reject` | `GridOperator`, `Backoffice` | Rejects reservation. *Requires mandatory remark (1-500 chars).* |
| `POST` | `/reservations/verify-qr` | `GridOperator` | Verifies and completes mobile QR check-in & power transfer. |
| `DELETE` | `/reservations/{id}` | `Prosumer`, `Backoffice` | Cancels reservation and restores slot capacity. |

---

## 5. Dashboard & Telemetry API (`/dashboard`)

| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `GET` | `/dashboard/backoffice` | `Backoffice` | Aggregates 7-day grid metrics, booking statuses, and pending activation queues. |
| `GET` | `/dashboard/operator/{stationId}` | `GridOperator` | Station-specific real-time telemetry, pending queue, and slot capacity loads. |

---

## 6. Users & Staff Management API (`/users` & `/prosumers`)

| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `GET` | `/users` | `Backoffice` | Lists all staff accounts (`Backoffice`, `GridOperator`). |
| `POST` | `/users` | `Backoffice` | Provisions a new Grid Operator or Administrator. |
| `PUT` | `/users/{id}` | `Backoffice` | Updates user details, contact info, or assigned role. |
| `GET` | `/prosumers/pending` | `Backoffice` | Lists prosumer accounts awaiting approval. |
| `PATCH` | `/prosumers/{id}/approve` | `Backoffice` | Activates prosumer account for grid trading. |
