/*
 * ResetPasswordPage.tsx
 * Opened from the reset email: /reset-password#token=…  The token travels in
 * the URL fragment so it never reaches a server log or a Referer header, and
 * it is wiped from the address bar as soon as the page has read it.
 * POST /auth/reset-password
 */

import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, ErrorAlert, TextField } from '../../components/ui'
import { useApiMutation } from '../../hooks/useApiMutation'
import { authService } from '../../services/authService'
import AuthCard from './AuthCard'
import { readResetToken } from './resetToken'

export default function ResetPasswordPage() {
  // Read once, then wipe it from the address bar and history (in an effect, so a
  // StrictMode double render still sees the token).
  const [token] = useState(() => readResetToken(window.location.hash))
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
  }, [])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const reset = useApiMutation((value: string) => authService.resetPassword(token!, value))

  const passwordError = touched && password.length < 8 ? 'At least 8 characters.' : null
  const confirmError = touched && confirm !== password ? 'The passwords do not match.' : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (password.length < 8 || confirm !== password) return
    const message = await reset.run(password)
    if (message) setDone(message)
  }

  if (!token) {
    return (
      <AuthCard title="This link doesn't work" subtitle="The reset link is incomplete or was already opened. Request a new one; it works once and expires after 20 minutes.">
        <Link to="/forgot-password" className="focus-ring inline-block rounded text-sm font-semibold text-[var(--color-primary-hover)] hover:underline">
          Request a new link
        </Link>
      </AuthCard>
    )
  }

  if (done) {
    return (
      <AuthCard title="Password changed" subtitle={`${done} Every device that was signed in has been signed out.`}>
        <Link to="/login" className="focus-ring inline-flex h-11 items-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white">
          Sign in
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Choose a new password" subtitle="Prosumers: after this, sign in on the SolarGridX mobile app as usual.">
      <form noValidate onSubmit={submit} className="space-y-4">
        <TextField label="New password" type="password" autoComplete="new-password" value={password} error={passwordError} hint="At least 8 characters." onChange={(e) => setPassword(e.target.value)} />
        <TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirm} error={confirmError} onChange={(e) => setConfirm(e.target.value)} />
        <ErrorAlert error={reset.error} />
        {reset.error?.code === 'RESET_TOKEN_INVALID' && (
          <Link to="/forgot-password" className="focus-ring inline-block rounded text-sm font-semibold text-[var(--color-primary-hover)] hover:underline">
            Request a new link
          </Link>
        )}
        <Button type="submit" fullWidth loading={reset.loading}>
          Set new password
        </Button>
      </form>
    </AuthCard>
  )
}
