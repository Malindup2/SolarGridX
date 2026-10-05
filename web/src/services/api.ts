/*
 * api.ts
 * Shared axios client: attaches the token and client type, signs out on 401,
 * and normalises every failure into one ApiError shape for the UI.
 */

import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiErrorResponse } from '../types/auth'
import { clearSession, getStoredToken } from '../lib/session'

const REQUEST_TIMEOUT_MS = 15000

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'X-Client-Type': 'web' },
  timeout: REQUEST_TIMEOUT_MS,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const isSignedIn = Boolean(getStoredToken())
    const isLoginCall = isAxiosError(error) && error.config?.url?.includes('/auth/login')

    if (isAxiosError(error) && error.response?.status === 401 && isSignedIn && !isLoginCall) {
      clearSession()
      window.location.assign('/login')
    }

    return Promise.reject(error)
  },
)

/** Every failure the UI renders, whatever produced it. */
export interface ApiError {
  status: number | null
  code: string
  message: string
  details: string[]
}

function isApiErrorBody(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as ApiErrorResponse).code === 'string' &&
    typeof (data as ApiErrorResponse).message === 'string'
  )
}

/** Turns anything thrown by a service call into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? null
    const data = error.response?.data

    if (isApiErrorBody(data)) {
      return {
        status,
        code: data.code,
        message: data.message,
        details: Array.isArray(data.details) ? data.details : [],
      }
    }

    if (!error.response) {
      const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      return {
        status: null,
        code: 'NETWORK_ERROR',
        message: timedOut
          ? 'The server took too long to respond. Please try again.'
          : 'Unable to reach the SolarGridX server. Check your connection and try again.',
        details: [],
      }
    }

    if (status === 429) {
      return { status, code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Wait a minute and try again.', details: [] }
    }

    if (status === 403) {
      return { status, code: 'FORBIDDEN', message: 'You do not have permission to do that.', details: [] }
    }

    if (status !== null && status >= 500) {
      // The API's X-Correlation-ID finds this request in the server log.
      const reference = error.response?.headers?.['x-correlation-id']
      return {
        status,
        code: 'SERVICE_UNAVAILABLE',
        message: 'The server ran into a problem. Please try again shortly.',
        details: typeof reference === 'string' && reference ? [`Reference: ${reference}`] : [],
      }
    }
  }

  return { status: null, code: 'UNKNOWN_ERROR', message: 'Something went wrong. Please try again.', details: [] }
}

export function isCanceled(error: unknown): boolean {
  return axios.isCancel(error)
}

export default api
