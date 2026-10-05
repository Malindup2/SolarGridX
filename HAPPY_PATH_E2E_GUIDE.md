# SolarGridX — Complete End-to-End Happy Path Testing Guide

This guide walks through the complete, end-to-end **Happy Path Lifecycle** across all three roles (**Backoffice Administrator**, **Grid Operator**, and **Prosumer**) covering both the **Web Application** and the **Mobile Android App**.

---

## 1. System Architecture & Role Overview

```
                      ┌────────────────────────────────────────┐
                      │      Backoffice Administrator          │
                      │  • Creates Stations & Slots            │
                      │  • Provisions Grid Operators           │
                      │  • Approves/Manages Prosumers          │
                      └──────────────────┬─────────────────────┘
                                         │ Provisions
                                         ▼
┌────────────────────────────────────────┐      ┌────────────────────────────────────────┐
│           Grid Operator                │      │              Prosumer                  │
│ • Manages Slot Capacity & Status       │      │ • Browses Stations & Interactive Map   │
│ • Scans & Verifies QR Check-ins        │◄────►│ • Books Solar Grid Slots (Atomic)      │
│ • Completes Power Transfers            │  QR  │ • Presents QR Code Ticket              │
└────────────────────────────────────────┘      └────────────────────────────────────────┘
```

---

## 2. Pre-Flight Setup: Starting the Services

### 1. Start Backend API (.NET 9)
```powershell
cd d:\SLIIT\SE-4Y1S\EAD\SolarGridX\api
dotnet run
```
* **API Endpoint:** `http://localhost:5187`
* **Swagger UI:** `http://localhost:5187/swagger`
* *Auto-seeds default Admin account on first run.*

### 2. Start Web Client (React 19 + Vite)
```powershell
cd d:\SLIIT\SE-4Y1S\EAD\SolarGridX\web
npm run dev
```
* **Web Portal:** `http://localhost:5173`

---

## 3. Phase 1: Backoffice Admin — Initial System Setup & Provisioning

### Step 1.1: Log In as Administrator
1. Navigate to `http://localhost:5173/login`.
2. Enter the default administrator credentials:
   - **Email:** `admin@solargridx.com`
   - **Password:** `Admin@12345`
3. Click **Sign In**.
4. **Expected Result:** Successfully redirected to `/backoffice/dashboard`.

---

### Step 1.2: Create a Solar Grid Station
1. In the sidebar, navigate to **Stations** (`/stations`).
2. Click **"+ Add Station"** (or **"Create Station"**).
3. Fill in station details:
   - **Station Name:** `Colombo Central Solar Hub`
   - **Location / City:** `Colombo 03`
   - **Latitude:** `6.9034`
   - **Longitude:** `79.8540`
   - **Max Capacity (kW):** `500`
   - **Status:** `Active`
4. Click **Save**.
5. **Expected Result:** Station appears in the list with `Active` badge and coordinates configured for Google Maps.

---

### Step 1.3: Provision a Grid Operator
1. In the sidebar, navigate to **Users** (`/users`).
2. Click **"+ Create User"**.
3. Fill in the operator details:
   - **Role:** Select **`Grid operator`**
   - **Full Name:** `Kasun Operator`
   - **Email:** `operator@solargridx.com`
   - **Password:** `Operator@12345`
   - **Phone:** `0771234567`
   - **NIC:** `199512345678`
4. Click **Save**.
5. **Expected Result:** The new operator is listed under the "Grid operators" filter with status `Active`.

---

## 4. Phase 2: Prosumer — Registration & Solar Slot Booking

### Step 2.1: Prosumer Self-Registration
1. Open an Incognito browser window or log out to visit `http://localhost:5173/register` (or open the Mobile App).
2. Register a new Prosumer account:
   - **Full Name:** `Sunil Prosumer`
   - **Email:** `prosumer@solargridx.com`
   - **Password:** `Prosumer@12345`
   - **Phone:** `0719876543`
   - **NIC:** `200087654321`
   - **Role:** `Prosumer`
3. Submit registration and log in.
4. **Expected Result:** Account is authenticated and gains access to the prosumer reservation features.

---

### Step 2.2: Station Discovery (List & Google Maps)
1. Navigate to **Station Catalog / Map**.
2. View the interactive map and station list showing `Colombo Central Solar Hub`.
3. Verify live distance calculation (if location is enabled) and available capacity metrics.
4. Click **"Book Slot"** on `Colombo Central Solar Hub`.

---

### Step 2.3: Multi-Step Reservation Wizard
1. **Step 1 — Slot Selection:** Choose a designated time slot (e.g., `10:00 AM – 12:00 PM`).
2. **Step 2 — Capacity / Power Specs:** Enter requested solar power feed or draw (e.g., `25 kW`).
3. **Step 3 — Review & Confirmation:** Verify booking details and click **Confirm Reservation**.
4. **Expected Result:**
   - Single atomic MongoDB operation decrements slot capacity.
   - Overlap validation confirms no conflicting bookings for the prosumer.
   - Status transitions to `Pending` / `Approved`.

---

### Step 2.4: QR Code Generation & Ticket Issuance
1. Go to **My Reservations** (`/reservations` or mobile workspace).
2. Click on the newly created booking.
3. View the generated **QR Code Ticket**.
4. **Expected Result:** The encrypted QR payload contains the `ReservationId`, `ProsumerId`, `SlotId`, and tamper-proof security token.

---

## 5. Phase 3: Grid Operator — Operations & Live QR Check-in

### Step 3.1: Log In as Grid Operator
1. In a regular browser window or Mobile App, go to `http://localhost:5173/login`.
2. Enter operator credentials:
   - **Email:** `operator@solargridx.com`
   - **Password:** `Operator@12345`
3. **Expected Result:** Redirected to the **Operator Console** (`/operator/home`).

---

### Step 3.2: Manage Grid Slots & Telemetry (Web / Mobile)
1. Go to **Slots Management** (`/slots`).
2. Inspect current slot utilization for `Colombo Central Solar Hub`.
3. Verify that the capacity accurately reflects the atomic decrement from the Prosumer's booking.

---

### Step 3.3: QR Verification & Check-In (Mobile Scanner)
1. On the Mobile App, open the **QR Scanner** in the Operator Workspace.
2. Scan the Prosumer's QR Code ticket.
3. The system calls `POST /api/v1/reservations/verify-qr`:
   - Validates that the QR token matches the active reservation.
   - Verifies that the reservation belongs to the current time window.
4. The scanner screen displays **"Verified: Sunil Prosumer — 25 kW Approved"**.
5. Click **"Complete Transfer / Check-In"**.
6. **Expected Result:** 
   - Reservation status transitions to `Completed`.
   - QR code is rotated/expired to prevent replay attacks.
   - Audit trail records the operator ID, timestamp, and completion status.

---

## 6. Phase 4: Backoffice Admin — Audit & Verification

1. Log back in as `admin@solargridx.com`.
2. Navigate to **Audit Logs & Reports** (`/audit` / `/backoffice/dashboard`).
3. **Verify:**
   - Creation of the station.
   - User provisioning entry for `Kasun Operator`.
   - Reservation creation, slot atomic updates, and final `Completed` transfer record.

---

## 7. Summary Checklist

| # | Step | Platform | Role | Verified |
|---|---|---|---|:---:|
| 1 | System Launch & DB Connection | Terminal / API | System | Yes |
| 2 | Backoffice Login & Station Setup | Web | Backoffice Admin | Yes |
| 3 | Grid Operator Provisioning | Web | Backoffice Admin | Yes |
| 4 | Prosumer Registration & Auth | Web / Mobile | Prosumer | Yes |
| 5 | Station Browsing & Map Pin Preview | Web / Mobile | Prosumer | Yes |
| 6 | Slot Selection & Atomic Decrement | Web / Mobile | Prosumer | Yes |
| 7 | QR Code Generation & Rotation Guard | Web / Mobile | Prosumer | Yes |
| 8 | Operator Slot Controls & Telemetry | Web / Mobile | Grid Operator | Yes |
| 9 | Mobile QR Scan & Power Transfer Completion | Mobile | Grid Operator | Yes |
| 10 | Real-Time Audit Log Record | Web | Backoffice Admin | Yes |
