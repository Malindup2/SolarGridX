/*
 * TodaySchedule.tsx
 * Today's slots at the station as a timeline: each row shows its time, how many battery
 * bays are taken, and whether it has passed, is running now, is still ahead, or is offline.
 */

import { Link } from 'react-router-dom'
import { Card, EmptyState, Icon, Skeleton } from '../../../components/ui'
import { useNow } from '../../../hooks/useNow'
import { formatSlotTime } from '../../../lib/format'
import { todaySchedule, type SlotState } from '../../../lib/operatorInsights'
import type { SlotResponse } from '../../../types/slot'

interface TodayScheduleProps {
  slots: SlotResponse[] | null
  bays: number
  loading?: boolean
}

const STATE_LABEL: Record<SlotState, string> = {
  past: 'Finished',
  now: 'Now',
  upcoming: 'Upcoming',
  offline: 'Offline',
}

export default function TodaySchedule({ slots, bays, loading = false }: TodayScheduleProps) {
  const now = useNow()
  const rows = slots ? todaySchedule(slots, bays, now) : null

  return (
    <Card
      title="Today's slots"
      padded={false}
      actions={
        <Link to="/slots" className="focus-ring rounded text-sm font-semibold text-[var(--color-primary-hover)] hover:underline">
          Manage
        </Link>
      }
    >
      {loading || rows === null ? (
        <div className="space-y-3 p-5" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Icon name="clock" size={26} />}
          title="No slots today"
          description="Generate today's slots on the Slots page so prosumers can book."
        />
      ) : (
        <ol className="max-h-[420px] divide-y divide-[var(--color-border)] overflow-y-auto" aria-label="Slots today">
          {rows.map(({ slot, state }) => {
            const share = bays > 0 ? Math.min(100, Math.round((slot.reservedCount / bays) * 100)) : 0
            const active = state === 'now'
            return (
              <li
                key={slot.id}
                className={`flex items-center gap-4 px-5 py-3.5 ${active ? 'bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]' : ''} ${
                  state === 'past' || state === 'offline' ? 'opacity-60' : ''
                }`}
                aria-current={active ? 'time' : undefined}
              >
                <span className="w-[104px] shrink-0 text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                  {formatSlotTime(slot.startTime, slot.endTime)}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className="h-2 overflow-hidden rounded-full bg-[var(--color-background)]"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={bays}
                    aria-valuenow={slot.reservedCount}
                    aria-label={`${slot.reservedCount} of ${bays} bays reserved`}
                  >
                    <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${share}%` }} />
                  </div>
                  <p className="mt-1 text-caption text-[var(--color-muted)]">
                    {slot.reservedCount} of {bays} bays
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-caption font-semibold ${
                    active
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-background)] text-[var(--color-muted)]'
                  }`}
                >
                  {STATE_LABEL[state]}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}
