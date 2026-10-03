/*
 * OperatorDashboardPage.tsx
 * Grid operator home (same story as the mobile app, with room for more): the station being run
 * and its queue, today's numbers, the next transfer, today's slot timeline, demand over the next
 * seven days and the reservation mix, with quick approve / reject on the pending queue.
 * GET /dashboard/operator/{stationId}, plus that station's reservations, slots and details.
 */

import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, DataTable, EmptyState, ErrorAlert, Icon, PageHeader, StatCard, type Column } from '../../components/ui'
import { BarChart, ChartCard, PieChart } from '../../components/charts'
import { useAuth } from '../../context/AuthContext'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatKwh, formatSlotDate, formatSlotTime } from '../../lib/format'
import { buildOperatorInsights } from '../../lib/operatorInsights'
import { reservationService } from '../../services/reservationService'
import { slotService } from '../../services/slotService'
import { stationService } from '../../services/stationService'
import type { ReservationResponse } from '../../types/reservation'
import HeroCard from './components/HeroCard'
import NextTransferCard from './components/NextTransferCard'
import SearchField from './components/SearchField'
import StationPills from './components/StationPills'
import TodaySchedule from './components/TodaySchedule'
import { readRememberedStation } from './components/stationMemory'
import { reservationColumns, reservationRowLabel } from './components/reservationColumns'
import { useReservationActions } from './components/useReservationActions'

function matches(row: ReservationResponse, query: string) {
  const haystack = [row.nic, row.stationName, row.status, formatSlotDate(row.reservationDate), formatSlotTime(row.startTime, row.endTime)]
    .join(' ')
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

export default function OperatorDashboardPage() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [stationId, setStationId] = useState(readRememberedStation)
  const [stationName, setStationName] = useState('')
  const [query, setQuery] = useState('')
  const enabled = { enabled: Boolean(stationId) }

  const { data, error, loading, reload: reloadQueue } = useApiQuery(
    (signal) => reservationService.operatorDashboard(stationId, signal),
    [stationId],
    enabled,
  )
  // The extra numbers only decorate the page: if they fail, the queue still works.
  const reservations = useApiQuery((signal) => reservationService.list({ stationId }, signal), [stationId], enabled)
  const slots = useApiQuery((signal) => slotService.forStation(stationId, signal), [stationId], enabled)
  const station = useApiQuery((signal) => stationService.getById(stationId, signal), [stationId], enabled)

  const reload = useCallback(() => {
    reloadQueue()
    reservations.reload()
    slots.reload()
  }, [reloadQueue, reservations, slots])

  const { can, open, dialogs } = useReservationActions({ onStale: reload })

  const onStation = useCallback((id: string, name: string) => {
    setStationId(id)
    setStationName(name)
  }, [])

  const bays = station.data?.batterySlotCount ?? 0
  const insights = useMemo(
    () => (reservations.data ? buildOperatorInsights(reservations.data, slots.data ?? [], bays) : null),
    [reservations.data, slots.data, bays],
  )
  const insightsLoading = reservations.loading || slots.loading || station.loading

  const rows = useMemo(
    () => (data ? data.pendingReservations.filter((row) => matches(row, query)) : null),
    [data, query],
  )

  const demandBars = useMemo(
    () =>
      (insights?.week ?? []).map((day, i) => {
        const date = new Date(`${day.day}T00:00:00Z`)
        return {
          label: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
          subLabel: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
          value: Math.round(day.kwh),
          hint: `${day.bookings} booking${day.bookings === 1 ? '' : 's'} · ${formatKwh(day.kwh)}`,
        }
      }),
    [insights],
  )

  const mixSlices = useMemo(() => {
    const counts = insights?.statusCounts
    return [
      { label: 'Pending', value: counts?.Pending ?? 0, color: '#f59e0b' },
      { label: 'Approved', value: counts?.Approved ?? 0, color: '#49b02d' },
      { label: 'Completed', value: counts?.Completed ?? 0, color: '#0c8ce9' },
      { label: 'Rejected', value: counts?.Rejected ?? 0, color: '#dc2626' },
      { label: 'Cancelled', value: counts?.Cancelled ?? 0, color: '#64748b' },
    ].filter((slice) => slice.value > 0 || insights?.total === 0)
  }, [insights])

  const actionColumn: Column<ReservationResponse> = {
    key: 'actions',
    header: 'Decide',
    align: 'right',
    render: (row) => {
      const allowed = can(row)
      return (
        // Stop the row click so the buttons don't also open the details page.
        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          {allowed.reject && (
            <Button size="sm" variant="secondary" onClick={() => open('rejected', row)}>
              Reject
            </Button>
          )}
          {allowed.approve && (
            <Button size="sm" onClick={() => open('approved', row)}>
              Approve
            </Button>
          )}
        </div>
      )
    },
  }

  const firstName = auth?.displayName.split(' ')[0] ?? ''
  const searching = query.trim() !== ''
  const utilisation = insights?.utilisation ?? null
  const open_ = (reservation: ReservationResponse) => navigate(`/reservations/${encodeURIComponent(reservation.id)}`)

  return (
    <>
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : 'Operator home'}
        subtitle="Review the queue and keep today's transfers moving."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/slots')} icon={<Icon name="clock" size={18} />}>
              Manage slots
            </Button>
            <Button variant="secondary" onClick={() => navigate('/reservations/new')} icon={<Icon name="plus" size={18} />}>
              New reservation
            </Button>
            <Button variant="secondary" onClick={reload} loading={loading} disabled={!stationId} icon={<Icon name="refresh" size={18} />}>
              Refresh
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        <HeroCard
          eyebrow="Your station"
          title={data?.stationName ?? (stationName || '—')}
          icon={<Icon name="pin" size={22} />}
          loading={loading}
          stats={[
            { label: 'Awaiting review', value: data?.pendingCount ?? '—' },
            { label: 'Approved, upcoming', value: data?.approvedFutureCount ?? '—' },
            { label: 'Bookings today', value: insights?.bookingsToday ?? '—' },
          ]}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <StationPills value={stationId} onChange={onStation} />
          <SearchField value={query} onChange={setQuery} className="lg:w-80" placeholder="Search NIC, date, time or status" />
        </div>

        <ErrorAlert error={error} onRetry={reload} />

        {/* Today at the station */}
        <section aria-label="Today at the station" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Bookings today"
            value={insights?.bookingsToday ?? '—'}
            hint="Pending, approved and completed"
            icon={<Icon name="calendar" size={20} />}
            tone="completed"
            loading={insightsLoading && !insights}
          />
          <StatCard
            label="Completed transfers"
            value={insights?.completedToday ?? '—'}
            hint="Scanned and confirmed today"
            icon={<Icon name="checkCircle" size={20} />}
            tone="approved"
            loading={insightsLoading && !insights}
          />
          <StatCard
            label="Energy booked"
            value={insights ? formatKwh(insights.kwhToday) : '—'}
            hint="Across today's bookings"
            icon={<Icon name="bolt" size={20} />}
            tone="pending"
            loading={insightsLoading && !insights}
          />
          <StatCard
            label="Bay utilisation"
            value={utilisation === null ? '—' : `${Math.round(utilisation * 100)}%`}
            hint={
              insights && insights.baysTotal > 0 ? (
                <span className="block">
                  <span className="block">
                    {insights.baysReserved} of {insights.baysTotal} bays reserved today
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[var(--color-background)]" aria-hidden="true">
                    <span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.round((utilisation ?? 0) * 100)}%` }} />
                  </span>
                </span>
              ) : (
                'No slots today'
              )
            }
            icon={<Icon name="pin" size={20} />}
            loading={insightsLoading && !insights}
          />
        </section>

        {/* The next transfer and the queue, beside today's slot timeline */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <NextTransferCard reservation={insights?.next ?? null} loading={insightsLoading && !insights} onOpen={open_} />

            <Card title="Pending queue" padded={false}>
              <DataTable
                caption="Pending reservations"
                columns={[...reservationColumns(['date', 'slot', 'nic', 'energy']), actionColumn]}
                rows={rows}
                loading={loading}
                rowKey={(row) => row.id}
                rowLabel={reservationRowLabel}
                onRowClick={open_}
                empty={
                  searching ? (
                    <EmptyState
                      icon={<Icon name="search" size={26} />}
                      title={`No results for “${query.trim()}”`}
                      description="Check the spelling, or search by NIC, date, time or status."
                      action={
                        <Button variant="subtle" onClick={() => setQuery('')}>
                          Clear search
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={<Icon name="checkCircle" size={26} />}
                      title="All caught up"
                      description="There are no pending reservations at this station."
                    />
                  )
                }
              />
            </Card>
          </div>

          <TodaySchedule slots={slots.data} bays={bays} loading={slots.loading || station.loading} />
        </div>

        {/* Demand and mix */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Demand, next 7 days"
            subtitle="Energy booked at this station per day (kWh)"
            loading={insightsLoading && !insights}
          >
            <BarChart data={demandBars} unit="kWh" height={200} />
          </ChartCard>

          <ChartCard
            title="Reservation mix"
            subtitle="Every reservation at this station by status"
            loading={insightsLoading && !insights}
          >
            <PieChart data={mixSlices} centerLabel="Total" centerValue={insights?.total ?? 0} />
          </ChartCard>
        </div>
      </div>

      {dialogs}
    </>
  )
}
