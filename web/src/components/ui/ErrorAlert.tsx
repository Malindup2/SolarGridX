/*
 * ErrorAlert.tsx
 * The one place API errors are rendered: the server's `message`, then its
 * `details` underneath when present.
 */

import type { ApiError } from '../../services/api'
import Button from './Button'

interface ErrorAlertProps {
  error: ApiError | null
  title?: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export default function ErrorAlert({ error, title, onRetry, onDismiss, className = '' }: ErrorAlertProps) {
  if (!error) return null

  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-[var(--radius-md)] border p-4 ${className}`}
      style={{
        borderColor: 'color-mix(in srgb, var(--color-status-rejected) 35%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--color-status-rejected) 6%, var(--color-surface))',
      }}
    >
      <svg
        className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-status-rejected)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
      </svg>
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>}
        <p className="text-sm text-[var(--color-ink)]">{error.message}</p>
        {error.details.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-caption text-[var(--color-muted)]">
            {error.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}
        {(onRetry || onDismiss) && (
          <div className="mt-3 flex gap-2">
            {onRetry && (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
