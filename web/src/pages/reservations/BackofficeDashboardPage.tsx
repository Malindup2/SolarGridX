/*
 * BackofficeDashboardPage.tsx
 * Backoffice overview: bookings for the next seven days by status, and the
 * latest pending reservations across all stations.
 * GET /bookings/search?dateFrom=&dateTo=
 */

import { Link, useNavigate } from 'react-router-dom'
import { Card, DataTable, EmptyState, ErrorAlert, Icon, PageHeader, StatCard } from '../../components/ui'
import HeroCard from './components/HeroCard'
import { useAuth } from '../../context/AuthContext'
import { useApiQuery } from '../../hooks/useApiQuery'
import { isoDate } from '../../lib/format'
import { prosumerService } from '../../services/prosumerService'
import { reservationService } from '../../services/reservationService'
import { stationService } from '../../services/stationService'
import { userService } from '../../services/userService'
import type { ReservationStatus } from '../../types/reservation'
import { reservationColumns, reservationRowLabel } from './components/reservationColumns'

const WINDOW_DAYS = 6
const RECENT_LIMIT = 8

export default function BackofficeDashboardPage() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const dateFrom = isoDate(0)
  const dateTo = isoDate(WINDOW_DAYS)

  const { data, error, loading, reload } = useApiQuery(
    (signal) => reservationService.searchBookings({ dateFrom, dateTo }, signal),
    [dateFrom, dateTo],
  )

  // Accounts and grid at a glance; each tile links to the page that acts on it.
  const pendingProsumers = useApiQuery((signal) => prosumerService.pending(signal), [])
  const stations = useApiQuery((signal) => stationService.getAll(signal), [])
  const users = useApiQuery((signal) => userService.list(signal), [])

  const count = (status: ReservationStatus) => data?.filter((row) => row.status === status).length ?? 0
  const pending = (data ?? []).filter((row) => row.status === 'Pending').slice(0, RECENT_LIMIT)

  return (
    <>
      <PageHeader
        title={auth?.displayName ? `Hello, ${auth.displayName.split(' ')[0]}` : 'Dashboard'}
        subtitle="Bookings across the grid for today and the next six days."
      />

      <div className="mb-6">
        <HeroCard
          eyebrow="Next 7 days"
          title={`${data?.length ?? 0} bookings across the grid`}
          icon={<Icon name="bolt" size={22} />}
          loading={loading}
          stats={[
            { label: 'Energy booked', value: data ? `${Math.round(data.filter((r) => r.status !== 'Cancelled' && r.status !== 'Rejected').reduce((sum, r) => sum + r.energyKwh, 0))} kWh` : '—' },
            { label: 'Need a decision', value: count('Pending') },
          ]}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Link to="/prosumers?status=Pending" className="focus-ring rounded-[var(--radius-xl)]">
          <StatCard
            label="Prosumers awaiting activation"
            tone="pending"
            icon={<Icon name="user" />}
            value={pendingProsumers.data?.length ?? '—'}
            loading={pendingProsumers.loading}
            hint="Open the activation queue"
          />
        </Link>
        <Link to="/stations" className="focus-ring rounded-[var(--radius-xl)]">
          <StatCard
            label="Active stations"
            tone="approved"
            icon={<Icon name="pin" />}
            value={stations.data ? `${stations.data.filter((st) => st.status === 'Active').length} of ${stations.data.length}` : '—'}
            loading={stations.loading}
          />
        </Link>
        <Link to="/users" className="focus-ring rounded-[var(--radius-xl)]">
          <StatCard
            label="Grid operators"
            icon={<Icon name="user" />}
            value={users.data?.filter((u) => u.role === 'GridOperator' && u.status === 'Active').length ?? '—'}
            loading={users.loading}
          />
        </Link>
      </div>

      <ErrorAlert error={error} onRetry={reload} className="mb-6" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending review" tone="pending" icon={<Icon name="hourglass" />} value={count('Pending')} loading={loading} />
        <StatCard label="Approved" tone="approved" icon={<Icon name="check" />} value={count('Approved')} loading={loading} />
        <StatCard label="Completed" tone="completed" icon={<Icon name="checkCircle" />} value={count('Completed')} loading={loading} />
        <StatCard label="Rejected or cancelled" tone="rejected" icon={<Icon name="close" />} value={count('Rejected') + count('Cancelled')} loading={loading} />
      </div>

      <Card
        title="Waiting for an operator"
        padded={false}
        actions={
          <Link
            to={`/bookings?dateFrom=${dateFrom}&dateTo=${dateTo}&status=Pending`}
            className="focus-ring rounded text-sm font-semibold text-[var(--color-primary-hover)] hover:underline"
          >
            Open booking monitor
          </Link>
        }
      >
        <DataTable
          caption="Pending reservations in the next seven days"
          columns={reservationColumns(['date', 'slot', 'station', 'nic', 'energy'])}
          rows={error ? [] : data ? pending : null}
          loading={loading}
          rowKey={(row) => row.id}
          rowLabel={reservationRowLabel}
          onRowClick={(row) => navigate(`/reservations/${encodeURIComponent(row.id)}`)}
          empty={<EmptyState title="Nothing waiting" description="No pending reservations in the next seven days." />}
        />
      </Card>
    </>
  )
}
