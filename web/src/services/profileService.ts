/*
 * profileService.ts
 * The signed-in user's own account: details and profile photo.
 */

import api from './api'
import type { ProfileResponse, UpdateProfileRequest } from '../types/user'

export const MAX_AVATAR_BYTES = 1024 * 1024
export const AVATAR_TYPES = ['image/jpeg', 'image/png']

export const profileService = {
  async me(signal?: AbortSignal): Promise<ProfileResponse> {
    const response = await api.get<ProfileResponse>('/users/me', { signal })
    return response.data
  },

  async update(data: UpdateProfileRequest): Promise<ProfileResponse> {
    const response = await api.put<ProfileResponse>('/users/me', {
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
    })
    return response.data
  },

  /** The photo as an object URL for <img>, or null when there is none. Revoke it when done. */
  async avatarUrl(userId: 'me' | string = 'me', signal?: AbortSignal): Promise<string | null> {
    try {
      const response = await api.get<Blob>(userId === 'me' ? '/users/me/avatar' : `/users/${encodeURIComponent(userId)}/avatar`, {
        responseType: 'blob',
        signal,
      })
      return URL.createObjectURL(response.data)
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 404) return null
      throw error
    }
  },

  async uploadAvatar(file: File): Promise<ProfileResponse> {
    const form = new FormData()
    form.append('file', file)
    const response = await api.put<ProfileResponse>('/users/me/avatar', form)
    return response.data
  },

  async removeAvatar(): Promise<ProfileResponse> {
    const response = await api.delete<ProfileResponse>('/users/me/avatar')
    return response.data
  },
}
