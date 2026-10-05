/*
 * station.ts
 * Describes the station data exchanged with the station API.
 */

export type StationType = 'AC' | 'DC'
export type StationStatus = 'Active' | 'Inactive'

/** Hours that replace the default opening hours on one weekday. */
export interface DayHours {
  day: string
  openTime: string
  closeTime: string
}

export interface StationSchedule {
  openTime: string
  closeTime: string
  activeDays: string[]
  /** Per-day overrides; empty when every active day uses the default hours. */
  dayHours: DayHours[]
}

export interface StationResponse {
  id: string
  stationName: string
  location: string
  latitude: number
  longitude: number
  capacityKwh: number
  batterySlotCount: number
  type: StationType
  operationalSchedule: StationSchedule
  status: StationStatus
  createdAt: string
  updatedAt: string
}

export interface CreateStationRequest {
  stationName: string
  location: string
  latitude: number
  longitude: number
  capacityKwh: number
  batterySlotCount: number
  type: StationType
  operationalSchedule: StationSchedule
}

export type UpdateStationRequest = Omit<CreateStationRequest, 'operationalSchedule'> & {
  /** The updatedAt the editor last saw; the API refuses the save if someone else changed the station since. */
  expectedUpdatedAt?: string
}