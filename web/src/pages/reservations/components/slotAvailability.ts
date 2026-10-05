/*
 * slotAvailability.ts
 * Why a slot can't be picked right now, for display only. The API enforces the
 * real rules (BR-01 window, BR-13 bays, BR-18 offline) on submit.
 */

import type { SlotResponse } from '../../../types/slot'

/** Slot start as an exact instant (slot days and times are Sri Lanka time, UTC+05:30). */
export function slotStart(slot: Pick<SlotResponse, 'slotDate' | 'startTime'>): Date {
  return new Date(`${slot.slotDate.slice(0, 10)}T${slot.startTime}:00+05:30`)
}

export function slotProblem(slot: SlotResponse, bays: number, now: Date): string | null {
  if (!slot.isAvailable) return 'Offline'
  if (bays > 0 && slot.reservedCount >= bays) return 'Full'
  if (slotStart(slot) <= now) return 'Already started'
  return null
}
