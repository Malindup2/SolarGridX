import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AuthContextType, AuthUser, UserRole, UserStatus } from '../types/auth'
import { authService } from '../services/authService'

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuth] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role') as UserRole | null
    const nic = localStorage.getItem('nic')
    const displayName = localStorage.getItem('displayName')
    const homeRoute = localStorage.getItem('homeRoute')
    const status = (localStorage.getItem('status') as UserStatus | null) || 'Active'

    if (token && role && displayName && homeRoute) {
      const mustChangePassword = localStorage.getItem('mustChangePassword') === 'true'
      return { token, role, nic, displayName, homeRoute, status, mustChangePassword }
    }
    return null
  })

  const login = ({ token, role, nic, displayName, homeRoute, status, mustChangePassword }: AuthUser) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    if (nic) localStorage.setItem('nic', nic)
    localStorage.setItem('displayName', displayName)
    localStorage.setItem('homeRoute', homeRoute)
    if (status) localStorage.setItem('status', status)
    localStorage.setItem('mustChangePassword', String(Boolean(mustChangePassword)))
    setAuth({ token, role, nic, displayName, homeRoute, status: status || 'Active', mustChangePassword: Boolean(mustChangePassword) })
  }

  const markPasswordChanged = () => {
    localStorage.setItem('mustChangePassword', 'false')
    setAuth((current) => (current ? { ...current, mustChangePassword: false } : current))
  }

  const logout = async () => {
    const token = localStorage.getItem('token')

    try {
      await authService.logout(token)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('nic')
      localStorage.removeItem('displayName')
      localStorage.removeItem('homeRoute')
      localStorage.removeItem('status')
      localStorage.removeItem('mustChangePassword')
      setAuth(null)
    }
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout, markPasswordChanged }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
