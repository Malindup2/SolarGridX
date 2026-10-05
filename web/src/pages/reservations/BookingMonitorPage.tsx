/*
 * BookingMonitorPage.tsx
 * Bookings over a date range, grouped by day with a per-status count.
 * GET /bookings/search?dateFrom=&dateTo=&status=&stationId=
 */

import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card,
  DataTable,
  DateRangeField,
  EmptyState,
  ErrorAlert,
  PageHeader,
  SelectField,
  Skeleton,
  StatusBadge,
} from '../../components/ui'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatSlotDate, isoDate, slotDayKey } from '../../lib/format'
import { reservationService } from '../../services/reservationService'
import {
  isReservationStatus,
  RESERVATION_STATUSES,
  type BookingSearchParams,
  type ReservationResponse,
} from '../../types/reservation'
import StationPicker from './components/StationPicker'
import { reservationColumns, reservationRowLabel } from './components/reservationColumns'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
// Bookings are only allowed up to 7 days ahead, so the default window is today + 6.
const DEFAULT_DAYS_AHEAD = 6

function groupByDay(rows: ReservationResponse[]) {
  const groups = new Map<string, ReservationResponse[]>()
  rows.forEach((row) => {
    const key = slotDayKey(row.reservationDate)
    groups.set(key, [...(groups.get(key) ?? []), row])
  })
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
}

function countByStatus(rows: ReservationResponse[]) {
  return RESERVATION_STATUSES.map((status) => ({
    status,
    count: rows.filter((row) => row.status === status).length,
  })).filter((entry) => entry.count > 0)
}

export default function BookingMonitorPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const fromParam = searchParams.get('dateFrom') ?? ''
  const toParam = searchParams.get('dateTo') ?? ''
  const statusParam = searchParams.get('status')
  const params: BookingSearchParams = {
    dateFrom: DATE_PATTERN.test(fromParam) ? fromParam : isoDate(0),
    dateTo: DATE_PATTERN.test(toParam) ? toParam : isoDate(DEFAULT_DAYS_AHEAD),
    status: isReservationStatus(statusParam) ? statusParam : undefined,
    stationId: searchParams.get('stationId') ?? undefined,
  }

  const { data, error, loading, reload } = useApiQuery(
    (signal) => reservationService.searchBookings(params, signal),
    [params.dateFrom, params.dateTo, params.status, params.stationId],
  )

  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(values).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    setSearchParams(next, { replace: true })
  }

  const groups = useMemo(() => (data ? groupByDay(data) : []), [data])
  const totals = useMemo(() => (data ? countByStatus(data) : []), [data])
  const columns = reservationColumns(['slot', 'station', 'nic', 'energy', 'status'])

  return (
    <>
      <PageHeader title="Booking monitor" subtitle="See what is booked across the grid, day by day." />

      <Card className="mb-6">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr] lg:items-end">
          <DateRangeField
            value={{ from: params.dateFrom ?? '', to: params.dateTo ?? '' }}
            onChange={(range) => update({ dateFrom: range.from, dateTo: range.to })}
          />
          <SelectField label="Status" value={params.status ?? ''} onChange={(event) => update({ status: event.target.value })}>
            <option value="">All statuses</option>
            {RESERVATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </SelectField>
          <StationPicker allowAll value={params.stationId ?? ''} onChange={(id) => update({ stationId: id })} />
        </div>
        {totals.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4" aria-live="polite">
            <span className="text-caption font-semibold text-[var(--color-muted)]">{data?.length} bookings:</span>
            {totals.map(({ status, count }) => (
              <span key={status} className="inline-flex items-center gap-1 text-caption text-[var(--color-muted)]">
                <StatusBadge status={status} /> {count}
              </span>
            ))}
          </div>
        )}
      </Card>

      <ErrorAlert error={error} onRetry={reload} className="mb-6" />

      {loading && (
        <Card>
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </Card>
      )}

      {!loading && !error && data && groups.length === 0 && (
        <Card>
          <EmptyState title="No bookings in this range" description="Widen the date range or clear the status and station filters." />
        </Card>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {groups.map(([day, rows]) => (
            <Card
              key={day}
              padded={false}
              title={
                <span className="flex items-center gap-3">
                  {formatSlotDate(day)}
                  <span className="rounded-full bg-[var(--color-background)] px-2.5 py-0.5 text-caption font-semibold text-[var(--color-muted)]">
                    {rows.length}
                  </span>
                </span>
              }
            >
              <DataTable
                caption={`Bookings on ${formatSlotDate(day)}`}
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                rowLabel={reservationRowLabel}
                onRowClick={(row) => navigate(`/reservations/${encodeURIComponent(row.id)}`)}
              />
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
