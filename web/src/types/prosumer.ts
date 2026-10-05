import type { UserStatus } from './auth'

export const PROSUMER_STATUSES: UserStatus[] = ['Pending', 'Active', 'Deactivated']

export interface ProsumerResponse {
  /** NIC is the prosumer's primary key (BR-06). */
  nic: string
  fullName: string
  email: string
  phone: string | null
  address: string | null
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface CreateProsumerRequest {
  nic: string
  fullName: string
  email: string
  password: string
  phone?: string | null
  address?: string | null
}

/** PUT /prosumers/{nic}: email is required. */
export interface UpdateProsumerRequest {
  fullName: string
  email: string
  phone?: string | null
  address?: string | null
}

/** Old format: 9 digits + V/X; new format: 12 digits. */
export const NIC_PATTERN = /^([0-9]{9}[vVxX]|[0-9]{12})$/
