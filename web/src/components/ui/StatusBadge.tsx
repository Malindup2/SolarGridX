/*
 * StatusBadge.tsx
 * Status pill for reservations, users, prosumers and stations. Shows a dot
 * plus the text label, so colour is never the only signal.
 */

interface StatusBadgeProps {
  status: string
  className?: string
}

const STATUS_COLORS: Record<string, string> = {
  Pending: 'var(--color-status-pending)',
  Approved: 'var(--color-status-approved)',
  Active: 'var(--color-status-approved)',
  Completed: 'var(--color-status-completed)',
  Rejected: 'var(--color-status-rejected)',
  Cancelled: 'var(--color-status-cancelled)',
  Deactivated: 'var(--color-status-cancelled)',
  Inactive: 'var(--color-status-cancelled)',
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? 'var(--color-muted)'

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-semibold ${className}`}
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {status}
    </span>
  )
}
