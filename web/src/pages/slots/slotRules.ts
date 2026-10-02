/*
 * slotRules.ts
 * Form checks and day filtering for the Slots page.
 */

import { slotDayKey } from '../../lib/format'
import { TIME_PATTERN, type SlotResponse } from '../../types/slot'

export interface SlotDraft {
  slotDate: string
  startTime: string
  endTime: string
  capacityKwh: string
}

export function validateSlotDraft(draft: SlotDraft): Partial<Record<keyof SlotDraft, string>> {
  const errors: Partial<Record<keyof SlotDraft, string>> = {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.slotDate)) errors.slotDate = 'Pick a day.'
  if (!TIME_PATTERN.test(draft.startTime)) errors.startTime = 'Use HH:mm.'
  if (!TIME_PATTERN.test(draft.endTime)) errors.endTime = 'Use HH:mm.'
  else if (TIME_PATTERN.test(draft.startTime) && draft.endTime <= draft.startTime) errors.endTime = 'Must end after it starts.'
  const capacity = Number(draft.capacityKwh)
  if (!Number.isFinite(capacity) || capacity <= 0) errors.capacityKwh = 'More than 0 kWh.'
  return errors
}

export function slotsForDay(slots: SlotResponse[], day: string) {
  return slots.filter((slot) => slotDayKey(slot.slotDate) === day).sort((a, b) => a.startTime.localeCompare(b.startTime))
}

