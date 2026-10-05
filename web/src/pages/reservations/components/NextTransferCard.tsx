/*
 * NextTransferCard.tsx
 * The next approved booking at the station: when it starts, who is coming and how much
 * energy, with a live countdown. The operator's "what is coming up" answer at a glance.
 */

import { Button, Icon, Skeleton } from '../../../components/ui'
import { useNow } from '../../../hooks/useNow'
import { formatKwh, formatSlotDate, formatSlotTime } from '../../../lib/format'
import { durationLabel, minutesUntil, startOf } from '../../../lib/operatorInsights'
import type { ReservationResponse } from '../../../types/reservation'

interface NextTransferCardProps {
  reservation: ReservationResponse | null
  loading?: boolean
  onOpen: (reservation: ReservationResponse) => void
}

export default function NextTransferCard({ reservation, loading = false, onOpen }: NextTransferCardProps) {
  const now = useNow()

  if (loading) {
    return (
      <section className="rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-float)]" aria-busy="true">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-4 h-9 w-48" />
        <Skeleton className="mt-3 h-4 w-64" />
      </section>
    )
  }

  if (!reservation) {
    return (
      <section
        aria-label="Next transfer"
        className="flex items-center gap-4 rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-float)]"
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]"
          aria-hidden="true"
        >
          <Icon name="calendar" size={22} />
        </span>
        <div>
          <h2 className="text-h3 text-[var(--color-ink)]">No upcoming transfers</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Approved bookings for this station appear here once they are due.</p>
        </div>
      </section>
    )
  }

  const minutes = minutesUntil(startOf(reservation), now)
  const running = minutes <= 0

  return (
    <section
      aria-label="Next transfer"
      className="rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-float)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 text-[var(--color-ink)]">Next transfer</h2>
        <span
          className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] px-3 py-1 text-caption font-semibold text-[var(--color-primary-hover)]"
          role="status"
        >
          {running && <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" aria-hidden="true" />}
          {running ? 'In progress' : `Starts in ${durationLabel(minutes)}`}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[34px] font-semibold leading-none tabular-nums text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {formatSlotTime(reservation.startTime, reservation.endTime)}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {formatSlotDate(reservation.reservationDate)} · NIC {reservation.nic} · {formatKwh(reservation.energyKwh)}
          </p>
        </div>
        <Button variant="secondary" onClick={() => onOpen(reservation)}>
          Open booking
        </Button>
      </div>
    </section>
  )
}
