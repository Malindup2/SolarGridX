/*
 * ReservationFacts.tsx
 * Key/value block describing one reservation. Used by details and summary.
 */

import type { ReactNode } from 'react'
import { StatusBadge } from '../../../components/ui'
import { formatDateTime, formatKwh, formatSlotDate, formatSlotTime } from '../../../lib/format'
import type { ReservationResponse } from '../../../types/reservation'

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption font-semibold uppercase tracking-wide text-[var(--color-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--color-ink)]">{children}</dd>
    </div>
  )
}

export default function ReservationFacts({ reservation }: { reservation: ReservationResponse }) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Fact label="Status">
        <StatusBadge status={reservation.status} />
      </Fact>
      <Fact label="Station">{reservation.stationName}</Fact>
      <Fact label="Prosumer NIC">
        <span className="font-mono">{reservation.nic}</span>
      </Fact>
      <Fact label="Date">{formatSlotDate(reservation.reservationDate)}</Fact>
      <Fact label="Slot">
        <span className="tabular-nums">{formatSlotTime(reservation.startTime, reservation.endTime)}</span>
      </Fact>
      <Fact label="Energy requested">{formatKwh(reservation.energyKwh)}</Fact>
      {reservation.approvedBy && (
        <Fact label={reservation.status === 'Rejected' ? 'Rejected by' : 'Approved by'}>{reservation.approvedBy}</Fact>
      )}
      {reservation.completedAt && <Fact label="Completed">{formatDateTime(reservation.completedAt)}</Fact>}
      <Fact label="Booked">{formatDateTime(reservation.createdAt)}</Fact>
      <Fact label="Reference">
        <span className="break-all font-mono text-caption text-[var(--color-muted)]">{reservation.id}</span>
      </Fact>
    </dl>
  )
}
