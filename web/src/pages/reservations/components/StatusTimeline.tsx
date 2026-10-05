/*
 * StatusTimeline.tsx
 * Where a reservation is in its lifecycle:
 *   Pending → Approved | Rejected | Cancelled, Approved → Completed | Cancelled
 */

import { formatDateTime } from '../../../lib/format'
import type { ReservationResponse } from '../../../types/reservation'

type StepState = 'done' | 'current' | 'upcoming' | 'stopped'

interface Step {
  label: string
  detail?: string
  state: StepState
}

function stepsFor(reservation: ReservationResponse): Step[] {
  const booked: Step = { label: 'Booked', detail: formatDateTime(reservation.createdAt), state: 'done' }

  switch (reservation.status) {
    case 'Pending':
      return [booked, { label: 'Awaiting operator review', state: 'current' }, { label: 'Energy transferred', state: 'upcoming' }]
    case 'Approved':
      return [
        booked,
        { label: 'Approved', detail: reservation.approvedBy ? `by ${reservation.approvedBy}` : undefined, state: 'done' },
        { label: 'Awaiting QR scan at the station', state: 'current' },
      ]
    case 'Completed':
      return [
        booked,
        { label: 'Approved', detail: reservation.approvedBy ? `by ${reservation.approvedBy}` : undefined, state: 'done' },
        { label: 'Energy transferred', detail: formatDateTime(reservation.completedAt), state: 'done' },
      ]
    case 'Rejected':
      return [booked, { label: 'Rejected', detail: reservation.approvedBy ? `by ${reservation.approvedBy}` : undefined, state: 'stopped' }]
    case 'Cancelled':
      return [booked, { label: 'Cancelled', detail: formatDateTime(reservation.updatedAt), state: 'stopped' }]
  }
}

const DOT_STYLES: Record<StepState, string> = {
  done: 'bg-[var(--color-status-approved)] border-[var(--color-status-approved)]',
  current: 'bg-[var(--color-surface)] border-[var(--color-status-pending)] ring-4 ring-[color-mix(in_srgb,var(--color-status-pending)_20%,transparent)]',
  upcoming: 'bg-[var(--color-surface)] border-[var(--color-border)]',
  stopped: 'bg-[var(--color-status-rejected)] border-[var(--color-status-rejected)]',
}

export default function StatusTimeline({ reservation }: { reservation: ReservationResponse }) {
  const steps = stepsFor(reservation)
  return (
    <ol className="space-y-0" aria-label="Reservation progress">
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
          {index < steps.length - 1 && (
            <span className="absolute left-[7px] top-5 h-[calc(100%-12px)] w-0.5 bg-[var(--color-border)]" aria-hidden="true" />
          )}
          <span className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${DOT_STYLES[step.state]}`} aria-hidden="true" />
          <div>
            <p
              className={`text-sm font-semibold ${
                step.state === 'upcoming' ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink)]'
              }`}
            >
              {step.label}
              {step.state === 'current' && <span className="sr-only"> (current step)</span>}
            </p>
            {step.detail && <p className="text-caption text-[var(--color-muted)]">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
