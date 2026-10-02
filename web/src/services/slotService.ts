/*
 * slotService.ts
 * Booking slots. Every write is Grid Operator only; the API enforces BR-09, BR-19..21.
 */

import api from './api'
import type { SlotRequest, SlotResponse } from '../types/slot'

const bySlot = (id: string) => `/slots/${encodeURIComponent(id)}`
const byStation = (stationId: string) => `/stations/${encodeURIComponent(stationId)}/slots`

export const slotService = {
  async forStation(stationId: string, signal?: AbortSignal): Promise<SlotResponse[]> {
    const response = await api.get<SlotResponse[]>(byStation(stationId), { signal })
    return response.data
  },

  /** Generates one day of slots from the station's operating hours. */
  async generate(stationId: string, date: string): Promise<SlotResponse[]> {
    const response = await api.post<SlotResponse[]>(`${byStation(stationId)}/generate`, { date })
    return response.data
  },

  async create(stationId: string, data: SlotRequest): Promise<SlotResponse> {
    const response = await api.post<SlotResponse>(byStation(stationId), data)
    return response.data
  },

  async update(id: string, data: SlotRequest): Promise<SlotResponse> {
    const response = await api.put<SlotResponse>(bySlot(id), data)
    return response.data
  },

  async setAvailability(id: string, isAvailable: boolean): Promise<SlotResponse> {
    const response = await api.patch<SlotResponse>(`${bySlot(id)}/availability`, { isAvailable })
    return response.data
  },

  async setBulkAvailability(slotIds: string[], isAvailable: boolean): Promise<void> {
    await api.patch('/slots/bulk-availability', { slotIds, isAvailable })
  },

  async remove(id: string): Promise<void> {
    await api.delete(bySlot(id))
  },
}
