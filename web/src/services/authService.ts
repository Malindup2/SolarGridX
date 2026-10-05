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

  /**
   * Changing the password signs out every other device, including this tab's old token,
   * so the API answers with a fresh session that the caller must store.
   */
  async changePassword(request: ChangePasswordRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/change-password', request)
    return response.data
  },

  /** Always answers the same, whether or not the email has an account. */
  async forgotPassword(email: string): Promise<string> {
    const response = await api.post<{ message: string }>('/auth/forgot-password', { email: email.trim().toLowerCase() })
    return response.data.message
  },

  async resetPassword(token: string, newPassword: string): Promise<string> {
    const response = await api.post<{ message: string }>('/auth/reset-password', { token, newPassword })
    return response.data.message
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
