/*
 * LiveClock.tsx
 * Today's date and the time in Sri Lanka (the system's time zone), kept current, for the top bar.
 * Full date and time from small screens up, just the time on a phone.
 */

import { Icon } from './ui'
import { useNow } from '../hooks/useNow'
import { clockLabel, timeLabel } from '../lib/format'

export default function LiveClock({ className = '' }: { className?: string }) {
  const now = useNow(15_000)
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-[var(--color-background)] px-3 py-1.5 text-sm tabular-nums text-[var(--color-ink)] ${className}`}
      title="Sri Lanka time"
    >
      <span className="text-[var(--color-primary)]">
        <Icon name="clock" size={16} />
      </span>
      <time dateTime={now.toISOString()} aria-label={`${clockLabel(now)}, Sri Lanka time`}>
        <span className="hidden sm:inline">{clockLabel(now)}</span>
        <span className="sm:hidden">{timeLabel(now)}</span>
      </time>
      <span className="hidden text-caption text-[var(--color-muted)] xl:inline">Sri Lanka time</span>
    </div>
  )
}
