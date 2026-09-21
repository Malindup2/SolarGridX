import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useLogoutConfirm } from '../components/auth/useLogoutConfirm'
import { authService } from '../services/authService'
import type { ApiErrorResponse } from '../types/auth'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { auth, markPasswordChanged } = useAuth()
  const { requestLogout, dialog } = useLogoutConfirm()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const forced = Boolean(auth?.mustChangePassword)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.error('The new password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('The new passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      await authService.changePassword({ currentPassword, newPassword })
      markPasswordChanged()
      toast.success('Password updated successfully.')
      navigate(auth?.homeRoute || '/', { replace: true })
    } catch (err: unknown) {
      if (isAxiosError<ApiErrorResponse>(err)) {
        const resp = err.response?.data
        if (resp?.details && resp.details.length > 0) {
          resp.details.forEach((d) => toast.error(d))
        } else {
          toast.error(resp?.message || 'Unable to update the password.')
        }
      } else {
        toast.error('An unexpected error occurred while updating the password.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 text-body rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all bg-[var(--color-surface)]'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[var(--color-background)]">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-modal)] p-8">
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">
          {forced ? 'Set a New Password' : 'Change Password'}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
          {forced
            ? 'Your account was created with a temporary password. Choose a new one before you continue.'
            : 'Enter your current password and choose a new one.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-button font-medium text-[var(--color-ink)] mb-1.5">
              {forced ? 'Temporary password' : 'Current password'}
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-button font-medium text-[var(--color-ink)] mb-1.5">
              New password
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <p className="text-[11px] text-[var(--color-muted)] mt-1">At least 8 characters.</p>
          </div>

          <div>
            <label className="block text-button font-medium text-[var(--color-ink)] mb-1.5">
              Confirm new password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-[var(--radius-md)] text-button font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-all duration-150 shadow-[var(--shadow-card)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-caption">
          {!forced && (
            <button
              type="button"
              onClick={() => navigate(auth?.homeRoute || '/')}
              className="text-[var(--color-muted)] hover:underline cursor-pointer"
            >
              Back to dashboard
            </button>
          )}
          <button
            type="button"
            onClick={requestLogout}
            className="ml-auto text-[var(--color-accent)] hover:underline cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
      {dialog}
    </div>
  )
}
