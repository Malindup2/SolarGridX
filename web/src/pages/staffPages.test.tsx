import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '../types/auth'
import type { ProsumerResponse } from '../types/prosumer'
import type { UserResponse } from '../types/user'

const authState: { auth: AuthUser | null } = { auth: null }
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ auth: authState.auth }) }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const users = vi.hoisted(() => ({ list: vi.fn(), createUser: vi.fn(), update: vi.fn(), remove: vi.fn() }))
vi.mock('../services/userService', () => ({ userService: users }))

const prosumers = vi.hoisted(() => ({ list: vi.fn(), activate: vi.fn(), get: vi.fn(), pending: vi.fn() }))
vi.mock('../services/prosumerService', () => ({ prosumerService: prosumers }))

const { default: UsersPage } = await import('./users/UsersPage')
const { default: ProsumersPage } = await import('./prosumers/ProsumersPage')

// A JWT whose payload says sub = "self-id".
const SELF_TOKEN = `x.${btoa(JSON.stringify({ sub: 'self-id' }))}.y`

function signIn(role: AuthUser['role']) {
  authState.auth = { token: SELF_TOKEN, role, displayName: 'Admin', homeRoute: '/', nic: null }
}

function renderAt(element: React.ReactNode, path = '/') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('UsersPage', () => {
  const list: UserResponse[] = [
    { id: 'self-id', fullName: 'Admin Me', email: 'me@x.lk', role: 'Backoffice', status: 'Active', createdAt: '2026-09-01T00:00:00Z' },
    { id: 'op-1', fullName: 'Nimal Operator', email: 'nimal@x.lk', role: 'GridOperator', status: 'Active', createdAt: '2026-09-02T00:00:00Z' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    signIn('Backoffice')
    users.list.mockResolvedValue(list)
  })

  it('lists web users with their roles', async () => {
    renderAt(<UsersPage />)

    expect((await screen.findAllByText('Nimal Operator')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Grid operator').length).toBeGreaterThan(0)
  })

  it('never offers to delete your own account', async () => {
    renderAt(<UsersPage />)
    await screen.findAllByText('Admin Me')

    for (const button of screen.getAllByRole('button', { name: 'Delete Admin Me' })) expect(button).toBeDisabled()
    for (const button of screen.getAllByRole('button', { name: 'Delete Nimal Operator' })) expect(button).toBeEnabled()
  })

  it('deletes another user after confirming', async () => {
    users.remove.mockResolvedValue(undefined)
    renderAt(<UsersPage />)
    await screen.findAllByText('Nimal Operator')

    await userEvent.click(screen.getAllByRole('button', { name: 'Delete Nimal Operator' })[0])
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete user' }))

    await waitFor(() => expect(users.remove).toHaveBeenCalledWith('op-1'))
    expect(users.list).toHaveBeenCalledTimes(2) // reloaded after the delete
  })

  it('validates the new-user form before calling the API', async () => {
    renderAt(<UsersPage />)
    await screen.findAllByText('Nimal Operator')

    await userEvent.click(screen.getByRole('button', { name: 'Add user' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Create user' }))

    expect(await screen.findByText('Enter the full name.')).toBeInTheDocument()
    expect(users.createUser).not.toHaveBeenCalled()
  })
})

describe('ProsumersPage', () => {
  const list: ProsumerResponse[] = [
    { nic: '851234567V', fullName: 'Kamala Pending', email: 'k@x.lk', phone: null, address: null, status: 'Pending', createdAt: '2026-09-01T00:00:00Z', updatedAt: '' },
    { nic: '200012345678', fullName: 'Sunil Active', email: 's@x.lk', phone: null, address: null, status: 'Active', createdAt: '2026-09-02T00:00:00Z', updatedAt: '' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    prosumers.list.mockResolvedValue(list)
  })

  it('shows the activation queue from the URL and activates from the row', async () => {
    signIn('Backoffice')
    prosumers.activate.mockResolvedValue({ ...list[0], status: 'Active' })
    renderAt(<ProsumersPage />, '/?status=Pending')

    expect((await screen.findAllByText('Kamala Pending')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Sunil Active')).not.toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'Activate' })[0])
    await waitFor(() => expect(prosumers.activate).toHaveBeenCalledWith('851234567V'))
  })

  it('gives grid operators a read-only list', async () => {
    signIn('GridOperator')
    renderAt(<ProsumersPage />)

    await screen.findAllByText('Kamala Pending')
    expect(screen.queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add prosumer' })).not.toBeInTheDocument()
  })
})
