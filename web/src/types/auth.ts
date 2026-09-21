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
  mustChangePassword?: boolean
}

export interface AuthUser {
  token: string
  role: UserRole
  nic?: string | null
  displayName: string
  homeRoute: string
  status?: UserStatus
  mustChangePassword?: boolean
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface AuthContextType {
  auth: AuthUser | null
  login: (data: AuthUser) => void
  markPasswordChanged: () => void
  logout: () => Promise<void>
}

export interface ApiErrorResponse {
  code: string
  message: string
  details?: string[] | null
}
