import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios'

const SESSION_KEYS = ['token', 'role', 'nic', 'displayName', 'homeRoute', 'status']

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'X-Client-Type': 'web' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const isSignedIn = Boolean(localStorage.getItem('token'))
    const isLoginCall = isAxiosError(error) && error.config?.url?.includes('/auth/login')

    if (isAxiosError(error) && error.response?.status === 401 && isSignedIn && !isLoginCall) {
      SESSION_KEYS.forEach((key) => localStorage.removeItem(key))
      window.location.assign('/login')
    }

    return Promise.reject(error)
  },
)

export default api
