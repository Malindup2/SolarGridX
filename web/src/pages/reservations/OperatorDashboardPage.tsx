/*
 * OperatorDashboardPage.tsx
 * Grid operator home (same layout as the mobile app): green hero for the
 * station being run with today's numbers, one-tap station pills, a search over
 * the pending queue, and quick approve / reject.
 * GET /dashboard/operator/{stationId}
 */

import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, DataTable, EmptyState, ErrorAlert, Icon, PageHeader, type Column } from '../../components/ui'
import { BarChart, ChartCard, PieChart } from '../../components/charts'
import { useAuth } from '../../context/AuthContext'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatSlotDate, formatSlotTime } from '../../lib/format'
import { reservationService } from '../../services/reservationService'
import type { ReservationResponse } from '../../types/reservation'
import HeroCard from './components/HeroCard'
import SearchField from './components/SearchField'
import StationPills from './components/StationPills'
import { readRememberedStation } from './components/stationMemory'
import { reservationColumns, reservationRowLabel } from './components/reservationColumns'
import { useReservationActions } from './components/useReservationActions'

const TODAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

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

  const { data, error, loading, reload } = useApiQuery(
    (signal) => reservationService.operatorDashboard(stationId, signal),
    [stationId],
    { enabled: Boolean(stationId) },
  )
  const { can, open, dialogs } = useReservationActions({ onStale: reload })

  const onStation = useCallback((id: string, name: string) => {
    setStationId(id)
    setStationName(name)
  }, [])

  const rows = useMemo(
    () => (data ? data.pendingReservations.filter((row) => matches(row, query)) : null),
    [data, query],
  )

  // Workload Donut Slices
  const queueSlices = useMemo(() => {
    const pending = data?.pendingCount ?? 0
    const approved = data?.approvedFutureCount ?? 0
    return [
      { label: 'Pending Review', value: pending, color: '#f59e0b' },
      { label: 'Approved Future', value: approved, color: '#49b02d' },
    ]
  }, [data])

  // Slot-by-Slot Energy Bar Chart
  const slotEnergyBars = useMemo(() => {
    const pendingList = data?.pendingReservations ?? []
    const slotsMap: Record<string, { energy: number; count: number }> = {}

    const defaultSlots = ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00']
    defaultSlots.forEach((slot) => {
      slotsMap[slot] = { energy: 0, count: 0 }
    })

    pendingList.forEach((res) => {
      const slotLabel = formatSlotTime(res.startTime, res.endTime)
      if (!slotsMap[slotLabel]) {
        slotsMap[slotLabel] = { energy: 0, count: 0 }
      }
      slotsMap[slotLabel].energy += res.energyKwh
      slotsMap[slotLabel].count += 1
    })

    return Object.entries(slotsMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slot, info]) => ({
        label: slot.split(' - ')[0] || slot,
        subLabel: slot.split(' - ')[1] ? `to ${slot.split(' - ')[1]}` : undefined,
        value: Math.round(info.energy),
        hint: `${info.count} pending (${Math.round(info.energy)} kWh)`,
      }))
  }, [data])

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

  return (
    <>
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : 'Operator home'}
        subtitle={TODAY}
        actions={
          <Button variant="secondary" onClick={reload} loading={loading} disabled={!stationId}>
            Refresh
          </Button>
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
          ]}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <StationPills value={stationId} onChange={onStation} />
          <SearchField value={query} onChange={setQuery} className="lg:w-80" placeholder="Search NIC, date, time or status" />
        </div>

        <ErrorAlert error={error} onRetry={reload} />

        {/* Visual Analytics Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Station Workload & Queue"
            subtitle="Pending decisions vs approved upcoming bookings"
            loading={loading}
          >
            <PieChart
              data={queueSlices}
              centerLabel="Active"
              centerValue={(data?.pendingCount ?? 0) + (data?.approvedFutureCount ?? 0)}
            />
          </ChartCard>

          <ChartCard
            title="Pending Solar Load by Time Window"
            subtitle="Hourly energy demand awaiting check-in (kWh)"
            loading={loading}
          >
            <BarChart
              data={slotEnergyBars}
              unit="kWh"
              height={200}
            />
          </ChartCard>
        </div>

        <Card title="Pending queue" padded={false}>
          <DataTable
            caption="Pending reservations"
            columns={[...reservationColumns(['date', 'slot', 'nic', 'energy']), actionColumn]}
            rows={rows}
            loading={loading}
            rowKey={(row) => row.id}
            rowLabel={reservationRowLabel}
            onRowClick={(row) => navigate(`/reservations/${encodeURIComponent(row.id)}`)}
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

      {dialogs}
    </>
  )
}
