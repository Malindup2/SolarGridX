/*
 * ReservationDetailsPage.tsx
 * One reservation, its progress, the prosumer's booking summary, and the
 * actions the signed-in role may take.
 * GET /reservations/{id}, GET /dashboard/prosumer/{nic}
 */

import { Link, useParams } from 'react-router-dom'
import { Button, Card, ErrorAlert, Icon, PageHeader, Skeleton, StatCard } from '../../components/ui'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatKwh, formatSlotDate, formatSlotTime } from '../../lib/format'
import { reservationService } from '../../services/reservationService'
import ReservationFacts from './components/ReservationFacts'
import StatusTimeline from './components/StatusTimeline'
import { useReservationActions } from './components/useReservationActions'
import ReservationChangeActions from './components/ReservationChangeActions'
import AuditHistory from '../../components/AuditHistory'
import { useAuth } from '../../context/AuthContext'

function ProsumerSummary({ nic }: { nic: string }) {
  const { data, error, loading } = useApiQuery((signal) => reservationService.prosumerDashboard(nic, signal), [nic])

  if (error) return <p className="text-sm text-[var(--color-muted)]">Booking summary unavailable: {error.message}</p>

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Active" tone="approved" icon={<Icon name="bolt" />} value={data?.activeCount ?? 0} loading={loading} />
      <StatCard label="Pending" tone="pending" icon={<Icon name="hourglass" />} value={data?.pendingCount ?? 0} loading={loading} />
      <StatCard label="Upcoming" tone="completed" icon={<Icon name="calendar" />} value={data?.approvedFutureCount ?? 0} loading={loading} />
    </div>
  )
}

export default function ReservationDetailsPage() {
  const { id = '' } = useParams()
  const { data: reservation, error, loading, reload } = useApiQuery(
    (signal) => reservationService.getById(id, signal),
    [id],
  )
  const { can, open, dialogs } = useReservationActions({ onStale: reload })
  const { auth } = useAuth()

  const breadcrumbs = [{ label: 'Reservations', to: '/reservations' }, { label: 'Details' }]

  if (loading && !reservation) {
    return (
      <>
        <PageHeader title="Reservation" breadcrumbs={breadcrumbs} />
        <Card>
          <div className="grid gap-5 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      </>
    )
  }

  if (error || !reservation) {
    return (
      <>
        <PageHeader title="Reservation" breadcrumbs={breadcrumbs} />
        <ErrorAlert error={error} onRetry={reload} />
        <Link to="/reservations" className="focus-ring mt-4 inline-block rounded text-sm font-semibold text-[var(--color-primary-hover)]">
          ← Back to reservations
        </Link>
      </>
    )
  }

  const allowed = can(reservation)
  // Operators may change a Pending or Approved booking on the prosumer's behalf (energy or slot).
  // An approved one goes back to Pending and its QR code stops working.
  const canChange = auth?.role === 'GridOperator' && (reservation.status === 'Pending' || reservation.status === 'Approved')
  const hasActions = allowed.approve || allowed.reject || allowed.cancel || canChange

  return (
    <>
      <PageHeader
        title={`${reservation.stationName} · ${formatSlotDate(reservation.reservationDate)}`}
        subtitle={`Reservation for prosumer ${reservation.nic}`}
        breadcrumbs={breadcrumbs}
        actions={
          hasActions && (
            <>
              {canChange && <ReservationChangeActions reservation={reservation} onStale={reload} />}
              {allowed.reject && (
                <Button variant="secondary" onClick={() => open('rejected', reservation)}>
                  Reject
                </Button>
              )}
              {allowed.approve && <Button onClick={() => open('approved', reservation)}>Approve</Button>}
              {allowed.cancel && (
                <Button variant="danger" onClick={() => open('cancelled', reservation)}>
                  Cancel reservation
                </Button>
              )}
            </>
          )
        }
      />

      {reservation.status === 'Rejected' && reservation.rejectionReason && (
        <div
          className="mb-6 rounded-[var(--radius-md)] border p-4"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-status-rejected) 30%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-status-rejected) 5%, var(--color-surface))',
          }}
        >
          <p className="text-caption font-semibold uppercase tracking-wide text-[var(--color-status-rejected)]">Rejection reason</p>
          <p className="mt-1 whitespace-pre-line text-sm text-[var(--color-ink)]">{reservation.rejectionReason}</p>
        </div>
      )}

      {/* Key numbers at a glance, split by thin dividers (as on mobile) */}
      <dl className="mb-6 grid grid-cols-3 divide-x divide-[var(--color-border)] rounded-[var(--radius-xl)] bg-[var(--color-surface)] py-5 text-center shadow-[var(--shadow-float)]">
        {[
          { label: 'Energy', value: formatKwh(reservation.energyKwh) },
          { label: 'Time slot', value: formatSlotTime(reservation.startTime, reservation.endTime) },
          { label: 'Date', value: formatSlotDate(reservation.reservationDate) },
        ].map((item) => (
          <div key={item.label} className="px-3">
            <dd className="text-lg font-semibold text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              {item.value}
            </dd>
            <dt className="mt-1 text-caption text-[var(--color-muted)]">{item.label}</dt>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card title="Reservation">
            <ReservationFacts reservation={reservation} />
          </Card>
          <Card title="Prosumer bookings">
            <ProsumerSummary nic={reservation.nic} />
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Progress" as="aside">
            <StatusTimeline reservation={reservation} />
          </Card>
          <AuditHistory kind="reservations" id={reservation.id} title="Booking history" />
        </div>
      </div>

      {dialogs}
    </>
  )
}
