/*
 * fixtures.ts
 * Builders for API-shaped objects used across the web tests.
 */

import type { ReservationResponse } from '../types/reservation'

export function makeReservation(overrides: Partial<ReservationResponse> = {}): ReservationResponse {
  return {
    id: 'res-1',
    nic: '199812345678',
    stationId: 'station-1',
    stationName: 'Negombo Solar Hub',
    slotId: 'slot-1',
    reservationDate: '2026-10-03T00:00:00Z',
    startTime: '09:00',
    endTime: '10:00',
    slotTime: '2026-10-03 09:00-10:00',
    energyKwh: 12.5,
    status: 'Pending',
    qrEligible: false,
    approvedBy: null,
    rejectionReason: null,
    completedAt: null,
    createdAt: '2026-10-01T08:14:22Z',
    updatedAt: '2026-10-01T08:14:22Z',
    ...overrides,
  }
}
