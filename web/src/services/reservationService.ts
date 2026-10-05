/*
 * reservationService.ts
 * Reservation, booking search and dashboard calls. Business rules (BR-01..24)
 * live in the API; callers display the error it returns.
 */

import api from './api'
import { toParams } from '../lib/query'
import type {
  BookingSearchParams,
  CreateReservationRequest,
  ReservationPage,
  ReservationView,
  OperatorDashboard,
  ProsumerDashboard,
  ReservationFilters,
  ReservationResponse,
} from '../types/reservation'

const byId = (id: string) => `/reservations/${encodeURIComponent(id)}`

export const reservationService = {
  async list(filters: ReservationFilters = {}, signal?: AbortSignal): Promise<ReservationResponse[]> {
    const response = await api.get<ReservationResponse[]>('/reservations', { params: toParams(filters), signal })
    return response.data
  },

  async getById(id: string, signal?: AbortSignal): Promise<ReservationResponse> {
    const response = await api.get<ReservationResponse>(byId(id), { signal })
    return response.data
  },

  async approve(id: string): Promise<ReservationResponse> {
    const response = await api.patch<ReservationResponse>(`${byId(id)}/approve`)
    return response.data
  },

  async reject(id: string, reason: string): Promise<ReservationResponse> {
    const response = await api.patch<ReservationResponse>(`${byId(id)}/reject`, { reason: reason.trim() })
    return response.data
  },

  async cancel(id: string): Promise<ReservationResponse> {
    const response = await api.patch<ReservationResponse>(`${byId(id)}/cancel`)
    return response.data
  },

  async searchBookings(params: BookingSearchParams = {}, signal?: AbortSignal): Promise<ReservationResponse[]> {
    const response = await api.get<ReservationResponse[]>('/bookings/search', { params: toParams(params), signal })
    return response.data
  },

  async prosumerDashboard(nic: string, signal?: AbortSignal): Promise<ProsumerDashboard> {
    const response = await api.get<ProsumerDashboard>(`/dashboard/prosumer/${encodeURIComponent(nic)}`, { signal })
    return response.data
  },

  async operatorDashboard(stationId: string, signal?: AbortSignal): Promise<OperatorDashboard> {
    const response = await api.get<OperatorDashboard>(`/dashboard/operator/${encodeURIComponent(stationId)}`, {
      signal,
    })
    return response.data
  },

  /** Current / pending / history, paged. A prosumer only ever sees their own. */
  async view(
    view: ReservationView,
    params: { nic?: string; stationId?: string; page?: number; pageSize?: number } = {},
    signal?: AbortSignal,
  ): Promise<ReservationPage> {
    const response = await api.get<ReservationPage>(`/reservations/view/${view}`, { params: toParams(params), signal })
    return response.data
  },

  /** Grid operator booking on a prosumer's behalf; every reservation rule still applies. */
  async create(request: CreateReservationRequest): Promise<ReservationResponse> {
    const response = await api.post<ReservationResponse>('/reservations', request)
    return response.data
  },

  /**
   * Pending or Approved, at least 12 hours before it starts (BR-02). Changing an approved
   * booking sends it back to Pending and cancels its QR code (BR-16).
   */
  async updateEnergy(id: string, energyKwh: number, expectedUpdatedAt?: string): Promise<ReservationResponse> {
    const response = await api.put<ReservationResponse>(byId(id), { energyKwh, expectedUpdatedAt })
    return response.data
  },

  async reschedule(id: string, slotId: string, expectedUpdatedAt?: string): Promise<ReservationResponse> {
    const response = await api.patch<ReservationResponse>(`${byId(id)}/reschedule`, { slotId, expectedUpdatedAt })
    return response.data
  },
}
