/*
 * ActionSummaryPage.tsx
 * Completion page shown after approve / reject / cancel. It renders the
 * response of the call just made (router state); after a refresh that state
 * is gone, so it falls back to GET /reservations/{id}.
 */

import { Link, useLocation, useParams } from 'react-router-dom'
import { Card, ErrorAlert, Skeleton } from '../../components/ui'
import { useApiQuery } from '../../hooks/useApiQuery'
import { reservationService } from '../../services/reservationService'
import type { ReservationAction, ReservationResponse } from '../../types/reservation'
import ReservationFacts from './components/ReservationFacts'
import type { SummaryState } from './components/useReservationActions'

const COPY: Record<ReservationAction, { title: string; body: string; color: string; icon: string }> = {
  approved: {
    title: 'Reservation approved',
    body: 'The prosumer can now show their QR code at the station to receive the energy.',
    color: 'var(--color-status-approved)',
    icon: 'M5 13l4 4L19 7',
  },
  rejected: {
    title: 'Reservation rejected',
    body: 'The prosumer will see your reason in the mobile app.',
    color: 'var(--color-status-rejected)',
    icon: 'M6 18 18 6M6 6l12 12',
  },
  cancelled: {
    title: 'Reservation cancelled',
    body: 'The battery bay has been released for other prosumers.',
    color: 'var(--color-status-cancelled)',
    icon: 'M6 18 18 6M6 6l12 12',
  },
  created: {
    title: 'Reservation booked',
    body: "Booked on the prosumer's behalf. It waits in Pending for an operator to approve it, and the prosumer has been notified.",
    color: 'var(--color-status-pending)',
    icon: 'M5 13l4 4L19 7',
  },
  updated: {
    title: 'Energy updated',
    body: 'The reservation now books the new amount. It waits in Pending until an operator approves it; an approved booking needs approving again.',
    color: 'var(--color-status-pending)',
    icon: 'M5 13l4 4L19 7',
  },
  rescheduled: {
    title: 'Reservation moved',
    body: 'The booking now uses the new slot and the old battery bay was released.',
    color: 'var(--color-status-pending)',
    icon: 'M5 13l4 4L19 7',
  },
}

function isSummaryState(value: unknown, id: string): value is SummaryState {
  const state = value as SummaryState | null
  return Boolean(state?.reservation && state.reservation.id === id && state.action in COPY)
}

function actionFromStatus(reservation: ReservationResponse): ReservationAction | null {
  if (reservation.status === 'Approved') return 'approved'
  if (reservation.status === 'Rejected') return 'rejected'
  if (reservation.status === 'Cancelled') return 'cancelled'
  return null
}

export default function ActionSummaryPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const fromState = isSummaryState(location.state, id) ? location.state : null

  const { data, error, loading, reload } = useApiQuery((signal) => reservationService.getById(id, signal), [id], {
    enabled: !fromState,
  })

  const reservation = fromState?.reservation ?? data
  const action = fromState?.action ?? (data ? actionFromStatus(data) : null)
  const copy = action ? COPY[action] : null

  return (
    <div className="mx-auto max-w-3xl">
      {loading && (
        <Card>
          <div className="space-y-3">
            <Skeleton className="mx-auto h-14 w-14 rounded-full" />
            <Skeleton className="mx-auto h-6 w-60" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Card>
      )}

      <ErrorAlert error={error} onRetry={reload} />

      {reservation && (
        <Card>
          <div className="flex flex-col items-center border-b border-[var(--color-border)] pb-6 text-center">
            {copy && (
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full motion-safe:animate-[pop_450ms_cubic-bezier(0.34,1.56,0.64,1)]"
                style={{ backgroundColor: `color-mix(in srgb, ${copy.color} 14%, transparent)`, color: copy.color }}
                aria-hidden="true"
              >
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d={copy.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
            <h1 className="mt-4 text-h2 text-[var(--color-ink)]" tabIndex={-1}>
              {copy?.title ?? 'Reservation updated'}
            </h1>
            <p className="mt-1 max-w-md text-sm text-[var(--color-muted)]">
              {copy?.body ?? `This reservation is currently ${reservation.status.toLowerCase()}.`}
            </p>
          </div>

          <div className="pt-6">
            <ReservationFacts reservation={reservation} />
            {reservation.rejectionReason && (
              <p className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-background)] p-3 text-sm text-[var(--color-ink)]">
                <span className="font-semibold">Reason: </span>
                {reservation.rejectionReason}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:justify-end">
            <Link
              to="/reservations"
              className="focus-ring inline-flex h-11 items-center justify-center rounded-full px-5 text-button font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              Back to reservations
            </Link>
            <Link
              to={`/reservations/${encodeURIComponent(reservation.id)}`}
              className="focus-ring inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-6 text-button font-semibold text-white hover:bg-[var(--color-primary-hover)]"
            >
              View reservation
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
