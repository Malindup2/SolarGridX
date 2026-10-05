/*
 * prosumerService.ts
 * Prosumer accounts, keyed by NIC. Activation is Backoffice only (BR-05).
 */

import api from './api'
import type { UserStatus } from '../types/auth'
import type { CreateProsumerRequest, ProsumerResponse, UpdateProsumerRequest } from '../types/prosumer'

const byNic = (nic: string) => `/prosumers/${encodeURIComponent(nic)}`
const blankToNull = (value?: string | null) => (value?.trim() ? value.trim() : null)

export const prosumerService = {
  async list(status?: UserStatus, signal?: AbortSignal): Promise<ProsumerResponse[]> {
    const response = await api.get<ProsumerResponse[]>('/prosumers', { params: status ? { status } : undefined, signal })
    return response.data
  },

  async pending(signal?: AbortSignal): Promise<ProsumerResponse[]> {
    const response = await api.get<ProsumerResponse[]>('/prosumers/pending', { signal })
    return response.data
  },

  async get(nic: string, signal?: AbortSignal): Promise<ProsumerResponse> {
    const response = await api.get<ProsumerResponse>(byNic(nic), { signal })
    return response.data
  },

  async create(data: CreateProsumerRequest): Promise<ProsumerResponse> {
    const response = await api.post<ProsumerResponse>('/prosumers', {
      nic: data.nic.trim().toUpperCase(),
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      phone: blankToNull(data.phone),
      address: blankToNull(data.address),
    })
    return response.data
  },

  async update(nic: string, data: UpdateProsumerRequest): Promise<ProsumerResponse> {
    const response = await api.put<ProsumerResponse>(byNic(nic), {
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: blankToNull(data.phone),
      address: blankToNull(data.address),
    })
    return response.data
  },

  async activate(nic: string): Promise<ProsumerResponse> {
    const response = await api.patch<ProsumerResponse>(`${byNic(nic)}/activate`)
    return response.data
  },

  async deactivate(nic: string): Promise<ProsumerResponse> {
    const response = await api.patch<ProsumerResponse>(`${byNic(nic)}/deactivate`)
    return response.data
  },
}
