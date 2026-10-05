/*
 * SlotChooser.tsx
 * Pick one bookable slot at a station on a given day. Offline, full and
 * already-started slots are shown but can't be picked, so the operator sees
 * why a time is missing. The API re-checks everything on submit.
 */

import { ErrorAlert, Skeleton } from '../../../components/ui'
import { useApiQuery } from '../../../hooks/useApiQuery'
import { formatKwh, slotDayKey } from '../../../lib/format'
import { slotService } from '../../../services/slotService'
import type { SlotResponse } from '../../../types/slot'
import { slotProblem } from './slotAvailability'

interface SlotChooserProps {
  stationId: string
  /** yyyy-MM-dd */
  day: string
  /** Battery bays at the station (slot is full when reservedCount reaches it). */
  bays: number
  value: SlotResponse | null
  onChange: (slot: SlotResponse) => void
  /** The slot a reservation already uses (rescheduling). */
  excludeSlotId?: string
}

export default function SlotChooser({ stationId, day, bays, value, onChange, excludeSlotId }: SlotChooserProps) {
  const { data, error, loading, reload } = useApiQuery((signal) => slotService.forStation(stationId, signal), [stationId], {
    enabled: Boolean(stationId),
  })

  if (!stationId) return <p className="text-sm text-[var(--color-muted)]">Pick a station first.</p>
  if (error) return <ErrorAlert error={error} onRetry={reload} />
  if (loading && !data) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
    )
  }

  const slots = (data ?? [])
    .filter((slot) => slotDayKey(slot.slotDate) === day && slot.id !== excludeSlotId)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (slots.length === 0) {
    return <p className="text-sm text-[var(--color-muted)]">No slots on this day. Pick another day, or ask for the day to be generated on the Slots page.</p>
  }

  return (
    <div role="radiogroup" aria-label="Slots" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {slots.map((slot) => {
        const problem = slotProblem(slot, bays, new Date())
        const selected = value?.id === slot.id
        return (
          <button
            key={slot.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={Boolean(problem)}
            onClick={() => onChange(slot)}
            className={[
              'focus-ring rounded-[var(--radius-md)] border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              selected
                ? 'border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]',
            ].join(' ')}
          >
            <span className="block text-sm font-semibold tabular-nums text-[var(--color-ink)]">
              {slot.startTime}–{slot.endTime}
            </span>
            <span className="block text-caption text-[var(--color-muted)]">{problem ?? `up to ${formatKwh(slot.capacityKwh)} · ${bays - slot.reservedCount} bay(s) free`}</span>
          </button>
        )
      })}
    </div>
  )
}
