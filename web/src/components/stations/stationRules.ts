/*
 * stationRules.ts
 * Station form checks (mirroring CreateStationRequestValidator / StationScheduleRequestValidator)
 * and list filtering. The API stays the authority.
 */

import type { StationResponse, StationSchedule, StationStatus, StationType } from '../../types/station'

export type ScheduleDraft = StationSchedule

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const TIME = /^\d{2}:\d{2}$/

export function validateSchedule(schedule: ScheduleDraft): string | null {
  if (!TIME.test(schedule.openTime) || !TIME.test(schedule.closeTime)) return 'Enter opening and closing times.'
  if (schedule.openTime >= schedule.closeTime) return 'Closing time must be later than opening time.'
  if (schedule.activeDays.length === 0) return 'Pick at least one operating day.'

  for (const entry of schedule.dayHours) {
    if (!schedule.activeDays.includes(entry.day)) return `${entry.day} has its own hours but is not an operating day.`
    if (!TIME.test(entry.openTime) || !TIME.test(entry.closeTime)) return `Enter ${entry.day}'s opening and closing times.`
    if (entry.openTime >= entry.closeTime) return `${entry.day} must close later than it opens.`
  }
  return null
}

/** The hours that apply on one weekday: its own override, else the default. */
export function hoursFor(schedule: Pick<ScheduleDraft, 'openTime' | 'closeTime' | 'dayHours'>, day: string) {
  const own = schedule.dayHours.find((entry) => entry.day === day)
  return own ? { openTime: own.openTime, closeTime: own.closeTime } : { openTime: schedule.openTime, closeTime: schedule.closeTime }
}

/** "06:00-18:00" for a day, e.g. for lists. */
export function describeHours(schedule: Pick<ScheduleDraft, 'openTime' | 'closeTime' | 'dayHours'>, day: string) {
  const hours = hoursFor(schedule, day)
  return `${hours.openTime}–${hours.closeTime}`
}

export interface StationDraft {
  stationName: string
  location: string
  latitude: string
  longitude: string
  capacityKwh: string
  batterySlotCount: string
  type: StationType
  schedule: ScheduleDraft
}

type DraftErrors = Partial<Record<Exclude<keyof StationDraft, 'schedule'> | 'schedule', string>>

export function validateStationDraft(draft: StationDraft, creating: boolean): DraftErrors {
  const errors: DraftErrors = {}
  const lat = Number(draft.latitude)
  const lng = Number(draft.longitude)
  const capacity = Number(draft.capacityKwh)
  const bays = Number(draft.batterySlotCount)

  if (!draft.stationName.trim() || draft.stationName.trim().length > 120) errors.stationName = 'Enter a name (up to 120 characters).'
  if (!draft.location.trim() || draft.location.trim().length > 250) errors.location = 'Enter the address (up to 250 characters).'
  if (draft.latitude.trim() === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) errors.latitude = 'Between -90 and 90.'
  if (draft.longitude.trim() === '' || !Number.isFinite(lng) || lng < -180 || lng > 180) errors.longitude = 'Between -180 and 180.'
  if (!Number.isFinite(capacity) || capacity <= 0) errors.capacityKwh = 'Must be more than 0 kWh.'
  if (!Number.isInteger(bays) || bays <= 0) errors.batterySlotCount = 'A whole number above 0.'
  if (creating) {
    const scheduleError = validateSchedule(draft.schedule)
    if (scheduleError) errors.schedule = scheduleError
  }
  return errors
}

export function filterStations(stations: StationResponse[], query: string, status: StationStatus | '') {
  const q = query.trim().toLowerCase()
  return stations.filter(
    (s) => (!status || s.status === status) && (!q || s.stationName.toLowerCase().includes(q) || s.location.toLowerCase().includes(q)),
  )
}

