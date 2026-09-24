/*
 * station.ts
 * Describes the station data exchanged with the station API.
 */

export type StationType = 'AC' | 'DC'
export type StationStatus = 'Active' | 'Inactive'

export interface StationSchedule {
  openTime: string
  closeTime: string
  activeDays: string[]
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

export type UpdateStationRequest = Omit<CreateStationRequest, 'operationalSchedule'>