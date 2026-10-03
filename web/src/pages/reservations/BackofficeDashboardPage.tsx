/*
 * BackofficeDashboardPage.tsx
 * Backoffice overview: bookings for the next seven days by status, and the
 * latest pending reservations across all stations.
 * GET /bookings/search?dateFrom=&dateTo=
 */

import { Link, useNavigate } from 'react-router-dom'
import { Card, DataTable, EmptyState, ErrorAlert, Icon, PageHeader } from '../../components/ui'
import { BarChart, ChartCard, PieChart } from '../../components/charts'
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

  // Donut chart status breakdown
  const statusSlices = [
    { label: 'Pending', value: count('Pending'), color: '#f59e0b' },
    { label: 'Approved', value: count('Approved'), color: '#49b02d' },
    { label: 'Completed', value: count('Completed'), color: '#0c8ce9' },
    { label: 'Rejected', value: count('Rejected'), color: '#dc2626' },
    { label: 'Cancelled', value: count('Cancelled'), color: '#64748b' },
  ].filter((s) => s.value > 0 || (data && data.length === 0))

  // 7-day daily energy demand bar chart
  const dailyBars = Array.from({ length: WINDOW_DAYS + 1 }, (_, i) => {
    const iso = isoDate(i)
    const d = new Date(`${iso}T00:00:00Z`)
    const label = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
    const subLabel = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    const dayRows = (data ?? []).filter((r) => r.reservationDate?.startsWith(iso))
    const energy = Math.round(
      dayRows
        .filter((r) => r.status !== 'Cancelled' && r.status !== 'Rejected')
        .reduce((sum, r) => sum + r.energyKwh, 0),
    )
    return {
      label,
      subLabel,
      value: energy,
      hint: `${dayRows.length} booking${dayRows.length === 1 ? '' : 's'}`,
    }
  })

  return (
    <>
      <PageHeader
        title={auth?.displayName ? `Hello, ${auth.displayName.split(' ')[0]}` : 'Dashboard'}
        subtitle="Bookings across the grid for today and the next six days."
      />

      {/* Quick Overview Hero */}
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

      {/* High-Density System Management Strip */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link
          to="/prosumers?status=Pending"
          className="focus-ring group flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-4 py-3.5 shadow-[var(--shadow-float)] transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
              <Icon name="user" size={18} />
            </span>
            <div className="truncate">
              <p className="truncate text-xs font-medium text-[var(--color-muted)]">Awaiting Activation</p>
              <p className="text-lg font-bold text-[var(--color-ink)]">
                {pendingProsumers.loading ? '…' : pendingProsumers.data?.length ?? 0}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold text-amber-600 opacity-80 group-hover:opacity-100">
            Review →
          </span>
        </Link>

        <Link
          to="/stations"
          className="focus-ring group flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-4 py-3.5 shadow-[var(--shadow-float)] transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
              <Icon name="pin" size={18} />
            </span>
            <div className="truncate">
              <p className="truncate text-xs font-medium text-[var(--color-muted)]">Active Stations</p>
              <p className="text-lg font-bold text-[var(--color-ink)]">
                {stations.loading ? '…' : stations.data ? `${stations.data.filter((st) => st.status === 'Active').length} / ${stations.data.length}` : '—'}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold text-[var(--color-muted)] group-hover:text-[var(--color-ink)]">
            Manage →
          </span>
        </Link>

        <Link
          to="/users"
          className="focus-ring group flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-4 py-3.5 shadow-[var(--shadow-float)] transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500">
              <Icon name="user" size={18} />
            </span>
            <div className="truncate">
              <p className="truncate text-xs font-medium text-[var(--color-muted)]">Grid Operators</p>
              <p className="text-lg font-bold text-[var(--color-ink)]">
                {users.loading ? '…' : users.data?.filter((u) => u.role === 'GridOperator' && u.status === 'Active').length ?? 0}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold text-[var(--color-muted)] group-hover:text-[var(--color-ink)]">
            Staff →
          </span>
        </Link>
      </div>

      <ErrorAlert error={error} onRetry={reload} className="mb-6" />

      {/* Compact Status Ribbon Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-2.5 shadow-[var(--shadow-float)] sm:flex-nowrap">
        <Link
          to={`/bookings?dateFrom=${dateFrom}&dateTo=${dateTo}&status=Pending`}
          className="focus-ring flex flex-1 items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-amber-500/10"
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-medium text-[var(--color-muted)]">Pending</span>
          </div>
          <span className="text-sm font-bold text-amber-600">{count('Pending')}</span>
        </Link>

        <div className="hidden h-5 w-px bg-[var(--color-border)] sm:block" />

        <Link
          to={`/bookings?dateFrom=${dateFrom}&dateTo=${dateTo}&status=Approved`}
          className="focus-ring flex flex-1 items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-emerald-500/10"
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-[var(--color-muted)]">Approved</span>
          </div>
          <span className="text-sm font-bold text-emerald-600">{count('Approved')}</span>
        </Link>

        <div className="hidden h-5 w-px bg-[var(--color-border)] sm:block" />

        <Link
          to={`/bookings?dateFrom=${dateFrom}&dateTo=${dateTo}&status=Completed`}
          className="focus-ring flex flex-1 items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-blue-500/10"
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-[var(--color-muted)]">Completed</span>
          </div>
          <span className="text-sm font-bold text-blue-600">{count('Completed')}</span>
        </Link>

        <div className="hidden h-5 w-px bg-[var(--color-border)] sm:block" />

        <Link
          to={`/bookings?dateFrom=${dateFrom}&dateTo=${dateTo}`}
          className="focus-ring flex flex-1 items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-rose-500/10"
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-xs font-medium text-[var(--color-muted)]">Cancelled / Rejected</span>
          </div>
          <span className="text-sm font-bold text-rose-600">{count('Rejected') + count('Cancelled')}</span>
        </Link>
      </div>

      {/* Visual Analytics Grid */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Booking Status Distribution"
          subtitle="Proportion of reservations across the 7-day grid window"
          loading={loading}
        >
          <PieChart
            data={statusSlices}
            centerLabel="Total"
            centerValue={data?.length ?? 0}
          />
        </ChartCard>

        <ChartCard
          title="7-Day Energy Demand"
          subtitle="Daily booked solar energy feed & draw (kWh)"
          loading={loading}
        >
          <BarChart
            data={dailyBars}
            unit="kWh"
            height={200}
          />
        </ChartCard>
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
