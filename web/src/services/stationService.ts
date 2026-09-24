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

export const stationService = {
  async getAll(): Promise<StationResponse[]> {
    const response = await api.get<StationResponse[]>('/stations')
    return response.data
  },

  async getById(id: string): Promise<StationResponse> {
    const response = await api.get<StationResponse>(`/stations/${id}`)
    return response.data
  },

  async create(data: CreateStationRequest): Promise<StationResponse> {
    const response = await api.post<StationResponse>('/stations', data)
    return response.data
  },

  async update(id: string, data: UpdateStationRequest): Promise<StationResponse> {
    const response = await api.put<StationResponse>(`/stations/${id}`, data)
    return response.data
  },

  async updateSchedule(id: string, data: StationSchedule): Promise<StationResponse> {
    const response = await api.patch<StationResponse>(
      `/stations/${id}/schedule`,
      data,
    )
    return response.data
  },

  async activate(id: string): Promise<StationResponse> {
    const response = await api.patch<StationResponse>(`/stations/${id}/activate`)
    return response.data
  },

  async deactivate(id: string): Promise<StationResponse> {
    const response = await api.patch<StationResponse>(`/stations/${id}/deactivate`)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/stations/${id}`)
  },
}