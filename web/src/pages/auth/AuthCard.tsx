/*
 * AuthCard.tsx
 * Centered card used by the signed-out account pages (forgot / reset password).
 */

import type { ReactNode } from 'react'

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4 sm:p-6">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-modal)]">
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  )
}
