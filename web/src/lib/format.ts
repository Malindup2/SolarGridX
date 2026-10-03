/*
 * format.ts
 * Display formatting for dates, slot times and energy. The system runs on Sri
 * Lanka time (UTC+05:30): a slot's date and "HH:mm" times are Sri Lanka
 * wall-clock values, and "today" is read in that zone whatever the browser's
 * is. Slot dates come back as midnight and are only a calendar day, so they are
 * read with UTC parts to keep the day. Real timestamps are exact instants and
 * are shown in Sri Lanka time.
 */

export const SRI_LANKA_TIME_ZONE = 'Asia/Colombo'

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
  timeZone: SRI_LANKA_TIME_ZONE,
})

const TODAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: SRI_LANKA_TIME_ZONE,
})

const CLOCK_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: SRI_LANKA_TIME_ZONE,
})

const SRI_LANKA_DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: SRI_LANKA_TIME_ZONE,
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

/** Sri Lanka date and time for audit timestamps (createdAt, completedAt). */
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

/** The Sri Lanka calendar date of a moment, as yyyy-MM-dd. */
export function slDayKey(moment: Date): string {
  return SRI_LANKA_DAY_FORMAT.format(moment)
}

/** The Sri Lanka calendar date as yyyy-MM-dd, offset by `days`. */
export function isoDate(days = 0): string {
  return slDayKey(new Date(Date.now() + days * 24 * 60 * 60 * 1000))
}

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: SRI_LANKA_TIME_ZONE })

/** "20:52": the time of a moment in Sri Lanka, for narrow screens. */
export function timeLabel(moment: Date): string {
  return TIME_FORMAT.format(moment)
}

/** "Saturday 3 October · 20:52": a moment in Sri Lanka time, for the top bar clock. */
export function clockLabel(moment: Date): string {
  return CLOCK_FORMAT.format(moment).replace(' at ', ' · ')
}

/** "Saturday 3 October": today's date in Sri Lanka, for dashboard headers. */
export function todayLabel(): string {
  return TODAY_FORMAT.format(new Date())
}
