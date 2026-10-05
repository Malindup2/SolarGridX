/*
 * userRules.ts
 * Form checks and list filtering for the Users page (mirrors the API validators;
 * the API stays the authority).
 */

import { NIC_PATTERN } from '../../types/prosumer'
import type { StaffRole, UpdateUserRequest, UserResponse } from '../../types/user'

export type RoleFilter = 'Backoffice' | 'GridOperator'
export type StatusFilter = 'Active' | 'Deactivated'

export interface UserDraft {
  fullName: string
  email: string
  role: StaffRole
  status: UpdateUserRequest['status']
  password: string
  nic: string
  phone: string
  address: string
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateUserDraft(draft: UserDraft, creating: boolean): Partial<Record<keyof UserDraft, string>> {
  const errors: Partial<Record<keyof UserDraft, string>> = {}
  if (!draft.fullName.trim()) errors.fullName = 'Enter the full name.'
  if (!EMAIL_PATTERN.test(draft.email.trim())) errors.email = 'Enter a valid email address.'
  if (creating && draft.password.length < 8) errors.password = 'The temporary password needs at least 8 characters.'
  if (draft.nic.trim() && !NIC_PATTERN.test(draft.nic.trim())) errors.nic = '9 digits + V/X, or 12 digits.'
  return errors
}

export function filterUsers(users: UserResponse[], query: string, role: RoleFilter | '', status: StatusFilter | '') {
  const q = query.trim().toLowerCase()
  return users.filter(
    (user) =>
      (!role || user.role === role) &&
      (!status || user.status === status) &&
      (!q || [user.fullName, user.email, user.nic ?? ''].some((field) => field.toLowerCase().includes(q))),
  )
}

