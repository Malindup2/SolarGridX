import api from './api'
import type { LoginRequest, LoginResponse, RegisterRequest } from '../types/auth'

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    })
    return response.data
  },

  async register(data: RegisterRequest): Promise<void> {
    await api.post('/auth/register', {
      nic: data.nic.trim(),
      password: data.password,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
    })
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch {
      // Best-effort logout notification
    }
  },
}
