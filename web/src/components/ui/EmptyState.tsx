/*
 * EmptyState.tsx
 * Friendly "nothing here" message with an optional next action.
 */

import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
}

export default function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]">
        {icon ?? (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 15h8" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <p className="text-h3 text-[var(--color-ink)]">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
