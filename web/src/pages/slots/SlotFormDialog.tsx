/*
 * SlotFormDialog.tsx
 * Add one slot by hand or change an existing one. The API refuses overlaps in
 * the same station and day (SLOT_OVERLAP, BR-19) and lowering the capacity of
 * a slot that already has bookings (BR-09).
 */

import { useState, type FormEvent } from 'react'
import { Button, Dialog, ErrorAlert, TextField } from '../../components/ui'
import { useApiMutation } from '../../hooks/useApiMutation'
import { slotService } from '../../services/slotService'
import type { SlotRequest, SlotResponse } from '../../types/slot'
import { validateSlotDraft, type SlotDraft as Draft } from './slotRules'

interface SlotFormDialogProps {
  open: boolean
  stationId: string
  /** yyyy-MM-dd for a new slot. */
  date: string
  slot?: SlotResponse | null
  onClose: () => void
  onSaved: (slot: SlotResponse) => void
}

export default function SlotFormDialog({ open, stationId, date, slot, onClose, onSaved }: SlotFormDialogProps) {
  const creating = !slot
  const [draft, setDraft] = useState<Draft>({
    slotDate: slot ? slot.slotDate.slice(0, 10) : date,
    startTime: slot?.startTime ?? '09:00',
    endTime: slot?.endTime ?? '10:00',
    capacityKwh: slot ? String(slot.capacityKwh) : '',
  })
  const [touched, setTouched] = useState(false)
  const save = useApiMutation((value: Draft) => {
    const body: SlotRequest = { ...value, capacityKwh: Number(value.capacityKwh) }
    return creating ? slotService.create(stationId, body) : slotService.update(slot!.id, { ...body, expectedUpdatedAt: slot!.updatedAt })
  })

  const errors = touched ? validateSlotDraft(draft) : {}
  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(validateSlotDraft(draft)).length > 0) return
    const saved = await save.run(draft)
    if (saved) onSaved(saved)
  }

  return (
    <Dialog
      open={open}
      title={creating ? 'Add a slot' : `Edit ${slot!.startTime}–${slot!.endTime}`}
      description={slot && slot.reservedCount > 0 ? `${slot.reservedCount} booking(s) hold this slot, so its capacity cannot go down.` : undefined}
      busy={save.loading}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={save.loading} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="slot-form" loading={save.loading}>
            {creating ? 'Add slot' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="slot-form" noValidate onSubmit={submit} className="grid grid-cols-2 gap-4">
        <TextField label="Day" type="date" value={draft.slotDate} error={errors.slotDate} onChange={(e) => set('slotDate', e.target.value)} containerClassName="col-span-2" />
        <TextField label="Starts (UTC)" type="time" value={draft.startTime} error={errors.startTime} onChange={(e) => set('startTime', e.target.value)} />
        <TextField label="Ends (UTC)" type="time" value={draft.endTime} error={errors.endTime} onChange={(e) => set('endTime', e.target.value)} />
        <TextField
          label="Max energy per booking (kWh)"
          type="number"
          min={0}
          step="any"
          value={draft.capacityKwh}
          error={errors.capacityKwh}
          onChange={(e) => set('capacityKwh', e.target.value)}
          containerClassName="col-span-2"
        />
        <ErrorAlert error={save.error} className="col-span-2" />
      </form>
    </Dialog>
  )
}
