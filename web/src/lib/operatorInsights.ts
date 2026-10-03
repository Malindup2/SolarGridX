/*
 * operatorInsights.ts
 * What the operator dashboard shows beyond the pending queue, worked out from one
 * station's reservations and slots. Slot dates and "HH:mm" times are Sri Lanka time
 * (UTC+05:30), so "today" and "has it started" are judged in that zone.
 */

import type { ReservationResponse, ReservationStatus } from '../types/reservation'
import type { SlotResponse } from '../types/slot'
import { slDayKey } from './format'

const DAY_MS = 24 * 60 * 60 * 1000
const COUNTED: ReservationStatus[] = ['Pending', 'Approved', 'Completed']

export const dayOf = (iso: string) => iso.slice(0, 10)

/** Start of a reservation or slot as an exact instant. */
export function startOf(item: { reservationDate?: string; slotDate?: string; startTime: string }): Date {
  return new Date(`${dayOf((item.reservationDate ?? item.slotDate) as string)}T${item.startTime}:00+05:30`)
}

export function endOf(item: { reservationDate?: string; slotDate?: string; startTime: string; endTime: string }): Date {
  const date = dayOf((item.reservationDate ?? item.slotDate) as string)
  const end = new Date(`${date}T${item.endTime}:00+05:30`)
  return end <= startOf(item) ? new Date(end.getTime() + DAY_MS) : end
}

export const minutesUntil = (target: Date, now: Date) => Math.floor((target.getTime() - now.getTime()) / 60_000)

/** "25 min", "2 h 10 min", "3 days". */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${Math.max(minutes, 1)} min`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
  const days = Math.floor(minutes / (24 * 60))
  return `${days} day${days === 1 ? '' : 's'}`
}

export interface DayDemand {
  /** yyyy-MM-dd, Sri Lanka */
  day: string
  kwh: number
  bookings: number
}

export interface OperatorInsights {
  bookingsToday: number
  completedToday: number
  kwhToday: number
  baysReserved: number
  baysTotal: number
  /** Share of today's bays that are reserved, 0 to 1; null when there are no slots today. */
  utilisation: number | null
  /** The next approved booking that has not ended. */
  next: ReservationResponse | null
  /** Today and the next six days. */
  week: DayDemand[]
  statusCounts: Record<ReservationStatus, number>
  total: number
}

export function buildOperatorInsights(
  reservations: ReservationResponse[],
  slots: SlotResponse[],
  bayCount: number,
  now: Date = new Date(),
): OperatorInsights {
  const today = slDayKey(now)
  const todays = reservations.filter((r) => dayOf(r.reservationDate) === today && COUNTED.includes(r.status))
  const todaysSlots = slots.filter((s) => dayOf(s.slotDate) === today)
  const baysReserved = todaysSlots.reduce((sum, s) => sum + s.reservedCount, 0)
  const baysTotal = todaysSlots.length * bayCount

  const next =
    reservations
      .filter((r) => r.status === 'Approved' && endOf(r) > now)
      .sort((a, b) => startOf(a).getTime() - startOf(b).getTime())[0] ?? null

  const week: DayDemand[] = Array.from({ length: 7 }, (_, i) => {
    const day = slDayKey(new Date(now.getTime() + i * DAY_MS))
    const rows = reservations.filter((r) => dayOf(r.reservationDate) === day && COUNTED.includes(r.status))
    return { day, kwh: rows.reduce((sum, r) => sum + r.energyKwh, 0), bookings: rows.length }
  })

  const statusCounts: Record<ReservationStatus, number> = { Pending: 0, Approved: 0, Rejected: 0, Completed: 0, Cancelled: 0 }
  reservations.forEach((r) => {
    statusCounts[r.status] += 1
  })

  return {
    bookingsToday: todays.length,
    completedToday: todays.filter((r) => r.status === 'Completed').length,
    kwhToday: todays.reduce((sum, r) => sum + r.energyKwh, 0),
    baysReserved,
    baysTotal,
    utilisation: baysTotal > 0 ? Math.min(1, baysReserved / baysTotal) : null,
    next,
    week,
    statusCounts,
    total: reservations.length,
  }
}

export type SlotState = 'past' | 'now' | 'upcoming' | 'offline'

export interface ScheduleRow {
  slot: SlotResponse
  state: SlotState
  bays: number
}

/** Today's slots in time order, each tagged past, running now, upcoming, or offline. */
export function todaySchedule(slots: SlotResponse[], bayCount: number, now: Date = new Date()): ScheduleRow[] {
  const today = slDayKey(now)
  return slots
    .filter((s) => dayOf(s.slotDate) === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((slot) => {
      let state: SlotState = 'upcoming'
      if (!slot.isAvailable) state = 'offline'
      else if (endOf(slot) <= now) state = 'past'
      else if (startOf(slot) <= now) state = 'now'
      return { slot, state, bays: bayCount }
    })
}
