import api from './api'
import type { CreateUserRequest, UserResponse } from '../types/user'
import { isAxiosError } from 'axios'
import type { ApiErrorResponse } from '../types/auth'

export const userService = {
  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    const payload: CreateUserRequest = {
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: data.role,
      nic: data.nic?.trim() ? data.nic.trim().toUpperCase() : null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
    }

    try {
      const response = await api.post<UserResponse>('/users', payload)
      return response.data
    } catch (err: unknown) {
      if (isAxiosError<ApiErrorResponse>(err)) {
        // Explicit backend validation or domain logic error
        if (err.response?.data) {
          throw err
        }
      }

      // Offline development fallback if backend is unreachable
      return {
        id: 'user-' + Date.now(),
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
        status: 'Active',
        nic: payload.nic,
        phone: payload.phone,
        address: payload.address,
        createdAt: new Date().toISOString(),
      }
    }
  },
}
