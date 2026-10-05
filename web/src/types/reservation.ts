/*
 * reservation.ts
 * Reservation, booking search and dashboard shapes exchanged with the API
 * (api/DTOs/Reservations, api/DTOs/Dashboards).
 */

export const RESERVATION_STATUSES = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'] as const

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

export function isReservationStatus(value: string | null | undefined): value is ReservationStatus {
  return Boolean(value) && (RESERVATION_STATUSES as readonly string[]).includes(value as string)
}

export interface ReservationResponse {
  id: string
  nic: string
  stationId: string
  stationName: string
  slotId: string
  /** ISO-8601 midnight of the slot day (a calendar day), e.g. "2026-10-03T00:00:00Z". */
  reservationDate: string
  /** "HH:mm" */
  startTime: string
  /** "HH:mm" */
  endTime: string
  slotTime: string
  energyKwh: number
  status: ReservationStatus
  qrEligible: boolean
  approvedBy: string | null
  rejectionReason: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RejectReservationRequest {
  reason: string
}

export interface ReservationFilters {
  nic?: string
  status?: ReservationStatus
  stationId?: string
}

export interface BookingSearchParams extends ReservationFilters {
  /** yyyy-MM-dd, inclusive */
  dateFrom?: string
  /** yyyy-MM-dd, inclusive */
  dateTo?: string
}

export interface ProsumerDashboard {
  nic: string
  activeCount: number
  pendingCount: number
  approvedFutureCount: number
}

export interface OperatorDashboard {
  stationId: string
  stationName: string
  pendingCount: number
  approvedFutureCount: number
  pendingReservations: ReservationResponse[]
}

/** Actions that land on the summary page; each carries the response of the call just made. */
export type ReservationAction = 'approved' | 'rejected' | 'cancelled' | 'created' | 'updated' | 'rescheduled'

export type ReservationView = 'current' | 'pending' | 'history'

/** One page of GET /reservations/view/{view}. */
export interface ReservationPage {
  items: ReservationResponse[]
  page: number
  pageSize: number
  total: number
}

/** POST /reservations. A grid operator books on a prosumer's behalf with the prosumer's NIC. */
export interface CreateReservationRequest {
  nic: string
  stationId: string
  slotId: string
  /** yyyy-MM-dd, must match the slot */
  reservationDate: string
  startTime: string
  endTime: string
  energyKwh: number
}
