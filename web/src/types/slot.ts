export interface SlotResponse {
  id: string
  stationId: string
  /** ISO UTC midnight of the slot day. */
  slotDate: string
  /** "HH:mm" */
  startTime: string
  /** "HH:mm" */
  endTime: string
  /** Most energy ONE booking can take in this slot (not a shared pool). */
  capacityKwh: number
  isAvailable: boolean
  /** Battery bays taken, out of the station's batterySlotCount. */
  reservedCount: number
  /** Send back as expectedUpdatedAt when editing, to detect someone else's change. */
  updatedAt: string
}

export interface SlotRequest {
  /** yyyy-MM-dd */
  slotDate: string
  startTime: string
  endTime: string
  capacityKwh: number
  expectedUpdatedAt?: string
}

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
