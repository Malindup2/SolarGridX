/*
 * navConfig.tsx
 * Role-aware sidebar menu for the signed-in web app. Every item is a real
 * route, so sections can be linked, bookmarked and opened in a new tab.
 * Owners add their section here by asking M1 (see FRONTEND-OWNERSHIP §3).
 */

import type { ReactNode } from 'react'
import type { UserRole } from '../types/auth'

export interface NavItem {
  label: string
  to: string
  icon: ReactNode
  /** Match child routes too, e.g. /reservations/:id keeps "Reservations" active. */
  matchPrefix?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

function icon(d: string) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ICONS = {
  home: icon('M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10'),
  reservations: icon('M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 9 2 2 4-4'),
  bookings: icon('M4 19V5m0 14h16M8 15l3-4 3 2 5-6'),
  users: icon('M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 9v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.74'),
  prosumers: icon('M12 3v2m6.36.64-1.42 1.42M21 12h-2M5 12H3m3.06-4.94L4.64 5.64M8 12a4 4 0 1 1 8 0v1H8v-1Zm-2 5h12M9 21h6'),
  stations: icon('M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'),
  slots: icon('M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'),
}

const BACKOFFICE_NAV: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/backoffice/dashboard', icon: ICONS.home },
      { label: 'Reservations', to: '/reservations', icon: ICONS.reservations, matchPrefix: true },
      { label: 'Booking monitor', to: '/bookings', icon: ICONS.bookings },
    ],
  },
  {
    title: 'Accounts',
    items: [
      { label: 'Users', to: '/users', icon: ICONS.users, matchPrefix: true },
      { label: 'Prosumers', to: '/prosumers', icon: ICONS.prosumers, matchPrefix: true },
    ],
  },
  {
    title: 'Grid',
    items: [{ label: 'Stations', to: '/stations', icon: ICONS.stations, matchPrefix: true }],
  },
]

const OPERATOR_NAV: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Home', to: '/operator/home', icon: ICONS.home },
      { label: 'Reservations', to: '/reservations', icon: ICONS.reservations, matchPrefix: true },
      { label: 'Booking monitor', to: '/bookings', icon: ICONS.bookings },
    ],
  },
  {
    title: 'Grid',
    items: [
      { label: 'Stations', to: '/stations', icon: ICONS.stations, matchPrefix: true },
      { label: 'Slots', to: '/slots', icon: ICONS.slots, matchPrefix: true },
      { label: 'Prosumers', to: '/prosumers', icon: ICONS.prosumers, matchPrefix: true },
    ],
  },
]

export function navForRole(role: UserRole | undefined): NavSection[] {
  if (role === 'Backoffice') return BACKOFFICE_NAV
  if (role === 'GridOperator') return OPERATOR_NAV
  return []
}

export const ROLE_LABELS: Record<UserRole, string> = {
  Backoffice: 'Backoffice administrator',
  GridOperator: 'Grid operator',
  Prosumer: 'Prosumer',
}
