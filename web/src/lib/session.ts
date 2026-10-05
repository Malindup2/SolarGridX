/*
 * session.ts
 * Single source of truth for the browser session keys, so every sign-out path
 * clears the same set.
 */

export const SESSION_KEYS = [
  'token',
  'role',
  'nic',
  'displayName',
  'homeRoute',
  'status',
  'mustChangePassword',
] as const

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('token')
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Storage can be unavailable (private mode, blocked site data); nothing to clear.
  }
}
