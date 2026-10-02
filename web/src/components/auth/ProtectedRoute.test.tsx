import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '../../types/auth'
import ProtectedRoute from './ProtectedRoute'

const authState: { auth: AuthUser | null } = { auth: null }

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ auth: authState.auth }),
}))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    token: 'jwt',
    role: 'GridOperator',
    nic: null,
    displayName: 'Nimal',
    homeRoute: '/operator/home',
    status: 'Active',
    mustChangePassword: false,
    ...overrides,
  }
}

function Where() {
  const location = useLocation()
  return <p>at {location.pathname + location.search}</p>
}

function renderAt(path: string, guarded: { roles?: AuthUser['role'][]; allowPasswordChange?: boolean } = {}) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/reservations"
          element={
            <ProtectedRoute allowedRoles={guarded.roles} allowPasswordChange={guarded.allowPasswordChange}>
              <p>secret page</p>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    authState.auth = null
  })

  it('sends a signed-out visitor to /login and remembers where they were going', () => {
    renderAt('/reservations?status=Pending')

    expect(screen.getByText('at /login?redirect=%2Freservations%3Fstatus%3DPending')).toBeInTheDocument()
  })

  it('treats a session without a token as signed out', () => {
    authState.auth = user({ token: '' })
    renderAt('/reservations')

    expect(screen.getByText(/at \/login/)).toBeInTheDocument()
  })

  it('shows the page to a signed-in user when no roles are required', () => {
    authState.auth = user()
    renderAt('/reservations')

    expect(screen.getByText('secret page')).toBeInTheDocument()
  })

  it('shows the page to an allowed role', () => {
    authState.auth = user({ role: 'Backoffice' })
    renderAt('/reservations', { roles: ['Backoffice', 'GridOperator'] })

    expect(screen.getByText('secret page')).toBeInTheDocument()
  })

  it('sends a disallowed role to their own home route', () => {
    authState.auth = user({ role: 'GridOperator', homeRoute: '/operator/home' })
    renderAt('/reservations', { roles: ['Backoffice'] })

    expect(screen.getByText('at /operator/home')).toBeInTheDocument()
  })

  it('falls back to a role default when the home route is missing', () => {
    authState.auth = user({ role: 'Backoffice', homeRoute: '' })
    renderAt('/reservations', { roles: ['GridOperator'] })

    expect(screen.getByText('at /backoffice/dashboard')).toBeInTheDocument()
  })

  it('forces a first sign-in to change the temporary password', () => {
    authState.auth = user({ mustChangePassword: true })
    renderAt('/reservations')

    expect(screen.getByText('at /change-password')).toBeInTheDocument()
  })

  it('lets the change-password page itself through', () => {
    authState.auth = user({ mustChangePassword: true })
    renderAt('/reservations', { allowPasswordChange: true })

    expect(screen.getByText('secret page')).toBeInTheDocument()
  })
})
