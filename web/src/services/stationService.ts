/*
 * stationService.ts
 * Sends station requests through the application's authenticated API client.
 */

import api from './api'
import type {
  CreateStationRequest,
  StationResponse,
  StationSchedule,
  UpdateStationRequest,
} from '../types/station'

const byId = (id: string) => `/stations/${encodeURIComponent(id)}`

export const stationService = {
  async getAll(signal?: AbortSignal): Promise<StationResponse[]> {
    const response = await api.get<StationResponse[]>('/stations', { signal })
    return response.data
  },

  async getById(id: string, signal?: AbortSignal): Promise<StationResponse> {
    const response = await api.get<StationResponse>(byId(id), { signal })
    return response.data
  },

  async create(data: CreateStationRequest): Promise<StationResponse> {
    const response = await api.post<StationResponse>('/stations', data)
    return response.data
  },

  async update(id: string, data: UpdateStationRequest): Promise<StationResponse> {
    const response = await api.put<StationResponse>(byId(id), data)
    return response.data
  },

  /** `expectedUpdatedAt` makes the API refuse the save if someone else changed the schedule meanwhile. */
  async updateSchedule(id: string, data: StationSchedule, expectedUpdatedAt?: string): Promise<StationResponse> {
    const response = await api.patch<StationResponse>(`${byId(id)}/schedule`, { ...data, expectedUpdatedAt })
    return response.data
  },

  async activate(id: string): Promise<StationResponse> {
    const response = await api.patch<StationResponse>(`${byId(id)}/activate`)
    return response.data
  },

  /** 409 STATION_HAS_ACTIVE_RESERVATIONS lists the blocking bookings in `details` (BR-04). */
  async deactivate(id: string): Promise<StationResponse> {
    const response = await api.patch<StationResponse>(`${byId(id)}/deactivate`)
    return response.data
  },

  /** 409 STATION_HAS_DEPENDENCIES while slots or reservations reference it (BR-22). */
  async delete(id: string): Promise<void> {
    await api.delete(byId(id))
  },
}
