/*
 * HeroCard.tsx
 * Green summary card at the top of a dashboard (matches the mobile app hero):
 * an eyebrow + title on the left, up to three key numbers split by dividers.
 */

import type { ReactNode } from 'react'
import { Skeleton } from '../../../components/ui'

export interface HeroStat {
  label: string
  value: ReactNode
}

interface HeroCardProps {
  eyebrow: string
  title: ReactNode
  icon?: ReactNode
  stats: HeroStat[]
  loading?: boolean
  aside?: ReactNode
}

export default function HeroCard({ eyebrow, title, icon, stats, loading = false, aside }: HeroCardProps) {
  return (
    <section
      className="relative overflow-hidden rounded-[24px] bg-[var(--color-primary)] p-6 text-white sm:p-7"
      aria-label={eyebrow}
    >
      {/* Soft decorative glow, purely visual */}
      <span
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm text-white/80">{eyebrow}</p>
            <p className="truncate text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              {title}
            </p>
          </div>
        </div>

        <dl className="flex divide-x divide-white/25">
          {stats.map((stat) => (
            <div key={stat.label} className="px-6 first:pl-0 last:pr-0">
              <dd className="text-3xl font-semibold leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                {loading ? <Skeleton className="h-8 w-10 bg-white/30" /> : stat.value}
              </dd>
              <dt className="mt-2 text-sm text-white/80">{stat.label}</dt>
            </div>
          ))}
        </dl>
        {aside}
      </div>
    </section>
  )
}
