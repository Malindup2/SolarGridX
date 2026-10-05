/*
 * ReservationListPage.tsx
 * All reservations with NIC / status / station filters. Filters live in the
 * URL so a filtered view can be shared or bookmarked.
 * GET /reservations?nic=&status=&stationId=
 */

import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, DataTable, EmptyState, ErrorAlert, ExportButton, FilterPills, Icon, PageHeader, TextField } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useApiQuery } from '../../hooks/useApiQuery'
import { reservationService } from '../../services/reservationService'
import { isReservationStatus, RESERVATION_STATUSES, type ReservationFilters, type ReservationView } from '../../types/reservation'
import ReservationViewTable from './components/ReservationViewTable'
import StationPicker from './components/StationPicker'
import { reservationColumns, reservationRowLabel } from './components/reservationColumns'

const VIEWS: ReservationView[] = ['current', 'pending', 'history']

export default function ReservationListPage() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // ?view=current|pending|history switches to a server-paged booking view.
  const viewParam = searchParams.get('view')
  const view = VIEWS.includes(viewParam as ReservationView) ? (viewParam as ReservationView) : null
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const statusParam = searchParams.get('status')
  const filters: ReservationFilters = {
    nic: searchParams.get('nic') ?? undefined,
    status: isReservationStatus(statusParam) ? statusParam : undefined,
    stationId: searchParams.get('stationId') ?? undefined,
  }


  // Status is applied on the page so every pill can show its count; NIC and station go to the API.
  const { data: all, error, loading, reload } = useApiQuery(
    (signal) => reservationService.list({ nic: filters.nic, stationId: filters.stationId }, signal),
    [filters.nic, filters.stationId],
    { enabled: view === null },
  )
  const data = all ? (filters.status ? all.filter((row) => row.status === filters.status) : all) : null
  const countFor = (status?: string) => (all ? (status ? all.filter((row) => row.status === status).length : all.length) : 0)

  const setFilter = (key: keyof ReservationFilters | 'view' | 'page', value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next, { replace: true })
  }

  // The NIC box is applied on submit, not per keystroke.
  const applyNic = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nic = new FormData(event.currentTarget).get('nic')
    setFilter('nic', typeof nic === 'string' ? nic.trim().toUpperCase() : '')
  }

  const hasFilters = Boolean(filters.nic || filters.status || filters.stationId)

  return (
    <>
      <PageHeader
        title="Reservations"
        subtitle="Every energy reservation across the grid. Open one to review, approve, reject or cancel it."
        actions={
          <>
            <ExportButton kind="reservations" filters={{ nic: filters.nic, stationId: filters.stationId, status: view ? undefined : filters.status }} />
            {auth?.role === 'GridOperator' && (
              <Link
                to="/reservations/new"
                className="focus-ring inline-flex h-9 items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
              >
                <Icon name="plus" size={16} />
                New reservation
              </Link>
            )}
          </>
        }
      />

      <FilterPills<ReservationView>
        label="Booking view"
        className="mb-4"
        value={view ?? ''}
        onChange={(value) => setFilter('view', value)}
        options={[
          { value: '', label: 'All reservations' },
          { value: 'current', label: 'Current' },
          { value: 'pending', label: 'Pending queue' },
          { value: 'history', label: 'History' },
        ]}
      />

      <Card className="mb-6">
        <form onSubmit={applyNic} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <TextField
            label="Prosumer NIC"
            placeholder="e.g. 200012345678"
            name="nic"
            key={filters.nic ?? ''}
            defaultValue={filters.nic ?? ''}
            autoComplete="off"
          />
          <StationPicker allowAll value={filters.stationId ?? ''} onChange={(id) => setFilter('stationId', id)} />
          <div className="flex gap-2">
            <Button type="submit">Search</Button>
            {hasFilters && (
              <Button variant="ghost" onClick={() => setSearchParams({}, { replace: true })}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </Card>

      {view && (
        <ReservationViewTable
          view={view}
          nic={filters.nic}
          stationId={filters.stationId}
          page={page}
          onPageChange={(next) => setFilter('page', String(next))}
        />
      )}

      {!view && (
      <>
      {/* Status pills with live counts (reference: "Request" screen filters) */}
      <div role="radiogroup" aria-label="Filter by status" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {[undefined, ...RESERVATION_STATUSES].map((status) => {
          const selected = (filters.status ?? undefined) === status
          return (
            <button
              key={status ?? 'all'}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setFilter('status', status ?? '')}
              className={[
                'focus-ring h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors',
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)]',
              ].join(' ')}
            >
              {status ?? 'All'} · {countFor(status)}
            </button>
          )
        })}
      </div>

      <ErrorAlert error={error} onRetry={reload} className="mb-6" />

      {!error && (
        <Card padded={false}>
          {data && !loading && (
            <p className="border-b border-[var(--color-border)] px-5 py-3 text-caption text-[var(--color-muted)]" aria-live="polite">
              {data.length} reservation{data.length === 1 ? '' : 's'}
            </p>
          )}
          <DataTable
            caption="Reservations"
            columns={reservationColumns()}
            rows={data}
            loading={loading}
            rowKey={(row) => row.id}
            rowLabel={reservationRowLabel}
            onRowClick={(row) => navigate(`/reservations/${encodeURIComponent(row.id)}`)}
            empty={
              <EmptyState
                title={hasFilters ? 'No reservations match these filters' : 'No reservations yet'}
                description={
                  hasFilters
                    ? 'Try a different status or station, or clear the filters.'
                    : 'Reservations appear here as soon as prosumers book from the mobile app.'
                }
                action={
                  hasFilters ? (
                    <Button variant="secondary" onClick={() => setSearchParams({}, { replace: true })}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </Card>
      )}
      </>
      )}
    </>
  )
}
