/*
 * userService.ts
 * Web accounts (Backoffice and Grid Operator). Backoffice only (403 otherwise).
 */

import api from './api'
import type { CreateUserRequest, UpdateUserRequest, UserResponse } from '../types/user'

const blankToNull = (value?: string | null) => (value?.trim() ? value.trim() : null)

export const userService = {
  async list(signal?: AbortSignal): Promise<UserResponse[]> {
    const response = await api.get<UserResponse[]>('/users', { signal })
    return response.data
  },

  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    const response = await api.post<UserResponse>('/users', {
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: data.role,
      nic: data.nic?.trim() ? data.nic.trim().toUpperCase() : null,
      phone: blankToNull(data.phone),
      address: blankToNull(data.address),
    })
    return response.data
  },

  /** The API needs the whole object, role and status included. */
  async update(id: string, data: UpdateUserRequest): Promise<UserResponse> {
    const response = await api.put<UserResponse>(`/users/${encodeURIComponent(id)}`, {
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      status: data.status,
      nic: data.nic?.trim() ? data.nic.trim().toUpperCase() : null,
      phone: blankToNull(data.phone),
      address: blankToNull(data.address),
    })
    return response.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/users/${encodeURIComponent(id)}`)
  },
}
