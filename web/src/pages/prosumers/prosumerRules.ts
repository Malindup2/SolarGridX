/*
 * prosumerRules.ts
 * Form checks and list filtering for the Prosumers pages.
 */

import type { UserStatus } from '../../types/auth'
import { NIC_PATTERN, type ProsumerResponse } from '../../types/prosumer'
import { EMAIL_PATTERN } from '../users/userRules'

export interface ProsumerDraft {
  nic: string
  fullName: string
  email: string
  password: string
  phone: string
  address: string
}

export function validateProsumerDraft(draft: ProsumerDraft, creating: boolean): Partial<Record<keyof ProsumerDraft, string>> {
  const errors: Partial<Record<keyof ProsumerDraft, string>> = {}
  if (creating && !NIC_PATTERN.test(draft.nic.trim())) errors.nic = 'Enter a NIC: 9 digits + V/X, or 12 digits.'
  if (!draft.fullName.trim()) errors.fullName = 'Enter the full name.'
  if (!EMAIL_PATTERN.test(draft.email.trim())) errors.email = 'Enter a valid email address.'
  if (creating && draft.password.length < 8) errors.password = 'The temporary password needs at least 8 characters.'
  return errors
}

export function filterProsumers(prosumers: ProsumerResponse[], query: string, status: UserStatus | '') {
  const q = query.trim().toLowerCase()
  return prosumers.filter(
    (p) =>
      (!status || p.status === status) &&
      (!q || [p.nic, p.fullName, p.email].some((field) => field.toLowerCase().includes(q))),
  )
}

