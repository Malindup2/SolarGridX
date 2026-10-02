/*
 * format.ts
 * Display formatting for dates, slot times and energy. Slot dates come back
 * as UTC midnight, so they are read with UTC parts; local time would shift
 * them to the previous day west of UTC.
 */

const SLOT_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const KWH_FORMAT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })

function parse(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "Sat, 3 Oct 2026" for a slot day. */
export function formatSlotDate(value: string | null | undefined): string {
  const date = parse(value)
  return date ? SLOT_DATE_FORMAT.format(date) : '—'
}

/** "09:00–10:00" */
export function formatSlotTime(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`
}

/** Local date and time for audit timestamps (createdAt, completedAt). */
export function formatDateTime(value: string | null | undefined): string {
  const date = parse(value)
  return date ? DATE_TIME_FORMAT.format(date) : '—'
}

export function formatKwh(value: number): string {
  return `${KWH_FORMAT.format(value)} kWh`
}

/** The yyyy-MM-dd key of a slot day, for grouping. */
export function slotDayKey(value: string): string {
  return value.slice(0, 10)
}

/** Local calendar date as yyyy-MM-dd, offset by `days`. */
export function isoDate(days = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
