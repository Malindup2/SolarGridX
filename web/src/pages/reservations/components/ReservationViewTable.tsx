/*
 * ReservationViewTable.tsx
 * One booking view (Current / Pending / History), paged on the server.
 * GET /reservations/view/{view}?nic=&stationId=&page=&pageSize=
 */

import { useNavigate } from 'react-router-dom'
import { Button, Card, DataTable, EmptyState, ErrorAlert } from '../../../components/ui'
import { useApiQuery } from '../../../hooks/useApiQuery'
import { reservationService } from '../../../services/reservationService'
import type { ReservationView } from '../../../types/reservation'
import { reservationColumns, reservationRowLabel } from './reservationColumns'

const PAGE_SIZE = 20

const EMPTY: Record<ReservationView, { title: string; description: string }> = {
  current: { title: 'Nothing approved and upcoming', description: 'Approved bookings stay here until their slot ends.' },
  pending: { title: 'No bookings waiting', description: 'New bookings wait here until an operator approves or rejects them.' },
  history: { title: 'No history yet', description: 'Completed, rejected, cancelled and past bookings collect here.' },
}

interface ReservationViewTableProps {
  view: ReservationView
  nic?: string
  stationId?: string
  page: number
  onPageChange: (page: number) => void
}

export default function ReservationViewTable({ view, nic, stationId, page, onPageChange }: ReservationViewTableProps) {
  const navigate = useNavigate()
  const { data, error, loading, reload } = useApiQuery(
    (signal) => reservationService.view(view, { nic, stationId, page, pageSize: PAGE_SIZE }, signal),
    [view, nic, stationId, page],
  )

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  if (error) return <ErrorAlert error={error} onRetry={reload} />

  return (
    <Card padded={false}>
      {data && (
        <p className="border-b border-[var(--color-border)] px-5 py-3 text-caption text-[var(--color-muted)]" aria-live="polite">
          {data.total} booking{data.total === 1 ? '' : 's'}
          {pages > 1 && ` · page ${page} of ${pages}`}
        </p>
      )}
      <DataTable
        caption={`${view} bookings`}
        columns={reservationColumns()}
        rows={data?.items ?? null}
        loading={loading}
        rowKey={(row) => row.id}
        rowLabel={reservationRowLabel}
        onRowClick={(row) => navigate(`/reservations/${encodeURIComponent(row.id)}`)}
        empty={<EmptyState title={EMPTY[view].title} description={EMPTY[view].description} />}
      />
      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3">
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <span className="text-caption text-[var(--color-muted)]">
            Page {page} of {pages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= pages || loading} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </nav>
      )}
    </Card>
  )
}
