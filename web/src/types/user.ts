import type { UserRole, UserStatus } from './auth'

export interface CreateUserRequest {
  fullName: string
  email: string
  password: string
  role: 'Backoffice' | 'GridOperator'
  nic?: string | null
  phone?: string | null
  address?: string | null
}

export interface UserResponse {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
  nic?: string | null
  phone?: string | null
  address?: string | null
  createdAt: string
}
