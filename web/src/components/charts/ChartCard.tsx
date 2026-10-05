import type { ReactNode } from 'react'
import Card from '../ui/Card'

export interface ChartCardProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  loading?: boolean
}

export function ChartCard({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = '',
  loading = false,
}: ChartCardProps) {
  return (
    <Card
      className={`overflow-hidden transition-shadow hover:shadow-md ${className}`}
      padded={false}
    >
      <header className="flex flex-col gap-1 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--color-ink)]">{title}</h3>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 pt-1 sm:pt-0">{actions}</div>}
      </header>

      <div className="p-5">
        {loading ? (
          <div className="flex h-48 animate-pulse items-center justify-center rounded-lg bg-[var(--color-background)]">
            <span className="text-xs text-[var(--color-muted)]">Loading metrics...</span>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}
