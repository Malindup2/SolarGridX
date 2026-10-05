import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationInbox } from '../../types/activity'

const auth = vi.hoisted(() => ({ forgotPassword: vi.fn(), resetPassword: vi.fn() }))
vi.mock('../../services/authService', () => ({ authService: auth }))

const inboxState = vi.hoisted(() => ({
  inbox: null as NotificationInbox | null,
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('../../context/NotificationsContext', () => ({ useNotifications: () => inboxState }))

const navigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (original) => ({ ...(await original<typeof import('react-router-dom')>()), useNavigate: () => navigate }))

const { default: ForgotPasswordPage } = await import('../auth/ForgotPasswordPage')
const { default: ResetPasswordPage } = await import('../auth/ResetPasswordPage')
const { default: NotificationBell } = await import('../../components/NotificationBell')

const TOKEN = 'ab'.repeat(32)

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks the email, then shows the same confirmation whatever the API knows', async () => {
    auth.forgotPassword.mockResolvedValue('If an active SolarGridX account uses that email, a password reset link is on its way.')
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText('Enter the email address you sign in with.')).toBeInTheDocument()
    expect(auth.forgotPassword).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Email'), 'amal@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(auth.forgotPassword).toHaveBeenCalledWith('amal@example.com')
  })
})

describe('ResetPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('explains a missing or broken link', () => {
    window.history.replaceState(null, '', '/reset-password#token=nope')
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: "This link doesn't work" })).toBeInTheDocument()
  })

  it('wipes the token from the address bar and resets with it', async () => {
    window.history.replaceState(null, '', `/reset-password#token=${TOKEN}`)
    auth.resetPassword.mockResolvedValue('Your password has been reset.')
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>)

    await waitFor(() => expect(window.location.hash).toBe(''))

    await userEvent.type(screen.getByLabelText('New password'), 'Brand-new-9')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Brand-new-9')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(await screen.findByRole('heading', { name: 'Password changed' })).toBeInTheDocument()
    expect(auth.resetPassword).toHaveBeenCalledWith(TOKEN, 'Brand-new-9')
  })

  it('refuses mismatched passwords before calling the API', async () => {
    window.history.replaceState(null, '', `/reset-password#token=${TOKEN}`)
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>)

    await userEvent.type(screen.getByLabelText('New password'), 'Brand-new-9')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Different-9')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument()
    expect(auth.resetPassword).not.toHaveBeenCalled()
  })
})

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    inboxState.inbox = {
      unreadCount: 2,
      items: [
        { id: 'n1', category: 'Reservation', priority: 'Medium', message: 'Reservation approved', action: 'Reservation', resourceId: 'r1', createdAt: '2026-10-02T08:00:00Z', readAt: null },
        { id: 'n2', category: 'Account', priority: 'Low', message: 'Profile updated', action: 'Profile', resourceId: null, createdAt: '2026-10-01T08:00:00Z', readAt: '2026-10-01T09:00:00Z' },
      ],
    }
  })

  it('announces the unread count', () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)

    expect(screen.getByRole('button', { name: 'Notifications, 2 unread' })).toHaveTextContent('2')
  })

  it('opens an item: marks it read and goes to its record', async () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }))
    await userEvent.click(screen.getByRole('button', { name: /Reservation approved/ }))

    expect(inboxState.markRead).toHaveBeenCalledWith('n1')
    expect(navigate).toHaveBeenCalledWith('/reservations/r1')
  })

  it('does not mark an already-read item again', async () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }))
    await userEvent.click(screen.getByRole('button', { name: /Profile updated/ }))

    expect(inboxState.markRead).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/profile')
  })

  it('offers mark-all only while something is unread', async () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }))

    await userEvent.click(screen.getByRole('button', { name: 'Mark all read' }))
    expect(inboxState.markAllRead).toHaveBeenCalled()
  })
})
