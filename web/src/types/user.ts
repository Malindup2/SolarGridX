import type { UserRole, UserStatus } from './auth'

/** Web accounts only: prosumers are managed under /prosumers. */
export type StaffRole = 'Backoffice' | 'GridOperator'

export interface CreateUserRequest {
  fullName: string
  email: string
  password: string
  role: StaffRole
  nic?: string | null
  phone?: string | null
  address?: string | null
}

/** PUT /users/{id} needs the whole object, role and status included. */
export interface UpdateUserRequest {
  fullName: string
  email: string
  role: StaffRole
  status: Extract<UserStatus, 'Active' | 'Deactivated'>
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

/** GET /users/me — the signed-in user's own account. */
export interface ProfileResponse {
  id: string
  fullName: string
  email: string
  phone: string | null
  address: string | null
  nic: string | null
  role: UserRole
  status: UserStatus
  createdAt: string
  updatedAt: string
  /** Changes with every new photo; null when there is none. */
  avatarVersion: string | null
}

export interface UpdateProfileRequest {
  fullName: string
  email: string
  phone?: string | null
  address?: string | null
}
