/*
 * reservationColumns.tsx
 * Table columns shared by the reservation list, booking monitor and
 * operator dashboard, so a reservation always reads the same way.
 */

import { StatusBadge, type Column } from '../../../components/ui'
import { formatKwh, formatSlotDate, formatSlotTime } from '../../../lib/format'
import type { ReservationResponse } from '../../../types/reservation'

type ColumnKey = 'date' | 'slot' | 'station' | 'nic' | 'energy' | 'status'

const ALL_COLUMNS: Record<ColumnKey, Column<ReservationResponse>> = {
  date: {
    key: 'date',
    header: 'Date',
    render: (row) => <span className="whitespace-nowrap">{formatSlotDate(row.reservationDate)}</span>,
  },
  slot: {
    key: 'slot',
    header: 'Slot',
    render: (row) => <span className="whitespace-nowrap tabular-nums">{formatSlotTime(row.startTime, row.endTime)}</span>,
  },
  station: {
    key: 'station',
    header: 'Station',
    render: (row) => row.stationName,
  },
  nic: {
    key: 'nic',
    header: 'Prosumer NIC',
    render: (row) => <span className="font-mono text-[13px]">{row.nic}</span>,
    hideOnMobile: true,
  },
  energy: {
    key: 'energy',
    header: 'Energy',
    align: 'right',
    render: (row) => <span className="whitespace-nowrap tabular-nums">{formatKwh(row.energyKwh)}</span>,
  },
  status: {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
}

export function reservationColumns(keys: ColumnKey[] = ['date', 'slot', 'station', 'nic', 'energy', 'status']) {
  return keys.map((key) => ALL_COLUMNS[key])
}

export function reservationRowLabel(row: ReservationResponse) {
  return `Open reservation for ${row.nic} on ${formatSlotDate(row.reservationDate)} at ${formatSlotTime(
    row.startTime,
    row.endTime,
  )}, ${row.status}`
}
