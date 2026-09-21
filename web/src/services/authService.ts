import api from './api'
import type { ChangePasswordRequest, LoginRequest, LoginResponse } from '../types/auth'

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    })
    return response.data
  },

  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await api.post('/auth/change-password', request)
  },

  async logout(token?: string | null): Promise<void> {
    try {
      await api.post('/auth/logout', null, {
        timeout: 8000,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
    } catch {
      // The local session is cleared even if the server cannot be reached.
    }
  },
}
