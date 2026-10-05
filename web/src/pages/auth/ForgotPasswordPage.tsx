/*
 * ForgotPasswordPage.tsx
 * Asks for the account email and requests a reset link. The API answers the
 * same way whether or not the email exists, so this page does too.
 * POST /auth/forgot-password
 */

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, ErrorAlert, TextField } from '../../components/ui'
import { useApiMutation } from '../../hooks/useApiMutation'
import { authService } from '../../services/authService'
import AuthCard from './AuthCard'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const request = useApiMutation((value: string) => authService.forgotPassword(value))

  const emailError = touched && !EMAIL_PATTERN.test(email.trim()) ? 'Enter the email address you sign in with.' : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!EMAIL_PATTERN.test(email.trim())) return
    const message = await request.run(email)
    if (message) setSentMessage(message)
  }

  if (sentMessage) {
    return (
      <AuthCard title="Check your email" subtitle={sentMessage}>
        <p className="text-sm text-[var(--color-muted)]">The link works once and expires after 20 minutes. Check your spam folder if it doesn't arrive.</p>
        <Link to="/login" className="focus-ring mt-6 inline-block rounded text-sm font-semibold text-[var(--color-primary-hover)] hover:underline">
          Back to sign in
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter the email you sign in with and we'll send you a link to choose a new password.">
      <form noValidate onSubmit={submit} className="space-y-4">
        <TextField label="Email" type="email" autoComplete="email" value={email} error={emailError} onChange={(e) => setEmail(e.target.value)} />
        <ErrorAlert error={request.error} />
        <Button type="submit" fullWidth loading={request.loading}>
          Send reset link
        </Button>
      </form>
      <Link to="/login" className="focus-ring mt-5 inline-block rounded text-caption text-[var(--color-muted)] hover:underline">
        Back to sign in
      </Link>
    </AuthCard>
  )
}
