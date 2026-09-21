export type UserRole = 'Backoffice' | 'GridOperator' | 'Prosumer'

export type UserStatus = 'Pending' | 'Active' | 'Deactivated'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  role: UserRole
  nic?: string | null
  displayName: string
  homeRoute: string
  status?: UserStatus
}

export interface AuthUser {
  token: string
  role: UserRole
  nic?: string | null
  displayName: string
  homeRoute: string
  status?: UserStatus
}

export interface AuthContextType {
  auth: AuthUser | null
  login: (data: AuthUser) => void
  logout: () => Promise<void>
}

export interface ApiErrorResponse {
  code: string
  message: string
  details?: string[] | null
}
