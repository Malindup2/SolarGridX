/*
 * StationsPage.tsx
 * Microgrid nodes: a map overview (when a Maps key is set) and a searchable
 * list. Backoffice registers new nodes; both staff roles can open one.
 * GET /stations, POST /stations
 */

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import StationFormDialog from '../../components/stations/StationFormDialog'
import StationMap from '../../components/stations/StationMap'
import { filterStations } from '../../components/stations/stationRules'
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorAlert,
  ExportButton,
  FilterPills,
  Icon,
  PageHeader,
  StatusBadge,
  TextField,
  type Column,
} from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatKwh } from '../../lib/format'
import { stationService } from '../../services/stationService'
import type { StationResponse, StationStatus } from '../../types/station'

const shortDays = (days: string[]) => (days.length === 7 ? 'Every day' : days.map((d) => d.slice(0, 3)).join(', '))

export default function StationsPage() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const isBackoffice = auth?.role === 'Backoffice'
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StationStatus | ''>('')
  const [creating, setCreating] = useState(false)

  const { data, error, loading, reload } = useApiQuery((signal) => stationService.getAll(signal), [])
  const rows = useMemo(() => (data ? filterStations(data, query, status) : null), [data, query, status])
  const open = (station: StationResponse) => navigate(`/stations/${encodeURIComponent(station.id)}`)

  const columns: Column<StationResponse>[] = [
    {
      key: 'name',
      header: 'Station',
      render: (s) => (
        <div>
          <p className="font-semibold">{s.stationName}</p>
          <p className="text-caption text-[var(--color-muted)]">{s.location}</p>
        </div>
      ),
    },
    { key: 'capacity', header: 'Capacity', align: 'right', render: (s) => formatKwh(s.capacityKwh) },
    { key: 'bays', header: 'Bays', align: 'right', render: (s) => s.batterySlotCount },
    { key: 'type', header: 'Type', hideOnMobile: true, render: (s) => s.type },
    {
      key: 'hours',
      header: 'Hours (UTC)',
      hideOnMobile: true,
      render: (s) => (
        <span>
          {s.operationalSchedule.openTime}–{s.operationalSchedule.closeTime}
          <span className="block text-caption text-[var(--color-muted)]">{shortDays(s.operationalSchedule.activeDays)}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Stations"
        subtitle="Microgrid nodes, their capacity and operating hours."
        actions={
          <>
            <ExportButton kind="stations" filters={{ q: query, status }} />
            {isBackoffice && (
              <Button icon={<Icon name="plus" size={18} />} onClick={() => setCreating(true)}>
                Register station
              </Button>
            )}
          </>
        }
      />

      {data && <StationMap stations={data} onSelect={open} />}

      <Card className="mb-4">
        <TextField label="Search" placeholder="Name or address" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
      </Card>

      <FilterPills<StationStatus>
        label="Filter by status"
        className="mb-6"
        value={status}
        onChange={setStatus}
        options={[
          { value: '', label: 'All', count: data?.length },
          { value: 'Active', label: 'Active', count: data?.filter((s) => s.status === 'Active').length },
          { value: 'Inactive', label: 'Inactive', count: data?.filter((s) => s.status === 'Inactive').length },
        ]}
      />

      <ErrorAlert error={error} onRetry={reload} className="mb-6" />

      {!error && (
        <Card padded={false}>
          <DataTable
            caption="Stations"
            columns={columns}
            rows={rows}
            loading={loading}
            rowKey={(s) => s.id}
            rowLabel={(s) => `Open ${s.stationName}, ${s.status}`}
            onRowClick={open}
            empty={
              <EmptyState
                title={query || status ? 'No stations match' : 'No stations yet'}
                description={isBackoffice && !query && !status ? 'Register the first microgrid node to start taking bookings.' : 'Try another search.'}
              />
            }
          />
        </Card>
      )}

      {creating && (
        <StationFormDialog
          open
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            toast.success(`${saved.stationName} is registered.`)
            setCreating(false)
            open(saved)
          }}
        />
      )}
    </>
  )
}
