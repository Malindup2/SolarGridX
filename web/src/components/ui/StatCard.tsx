/*
 * StatCard.tsx
 * Metric tile: tinted icon circle, label, then the number (same order as the
 * mobile app and the reference dashboards). `loading` shows a skeleton value.
 */

import type { ReactNode } from 'react'
import Skeleton from './Skeleton'

type Tone = 'neutral' | 'pending' | 'approved' | 'completed' | 'rejected'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: Tone
  loading?: boolean
}

const TONE_COLORS: Record<Tone, string> = {
  neutral: 'var(--color-ink)',
  pending: 'var(--color-status-pending)',
  approved: 'var(--color-status-approved)',
  completed: 'var(--color-status-completed)',
  rejected: 'var(--color-status-rejected)',
}

export default function StatCard({ label, value, hint, icon, tone = 'neutral', loading = false }: StatCardProps) {
  const color = TONE_COLORS[tone]
  return (
    <div className="rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-float)]">
      {icon && (
        <span
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
      <div className="mt-1 text-[30px] font-semibold leading-tight text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
        {loading ? <Skeleton className="mt-1 h-8 w-16" /> : value}
      </div>
      {hint && <p className="mt-1 text-caption text-[var(--color-muted)]">{hint}</p>}
    </div>
  )
}
