/*
 * StationFormDialog.tsx
 * Register a microgrid node or edit its details (Backoffice). The operating
 * schedule is part of registration; afterwards it has its own editor
 * (PATCH /stations/{id}/schedule). Client checks mirror
 * CreateStationRequestValidator; the API stays the authority.
 */

import { useState, type FormEvent } from 'react'
import { Button, Dialog, ErrorAlert, SelectField, TextField } from '../ui'
import { useApiMutation } from '../../hooks/useApiMutation'
import { isMapsConfigured } from '../../services/googleMaps'
import { stationService } from '../../services/stationService'
import type { StationResponse, StationType } from '../../types/station'
import ScheduleFields from './ScheduleFields'
import { validateStationDraft, type StationDraft } from './stationRules'
import StationLocationPicker from './StationLocationPicker'

interface StationFormDialogProps {
  open: boolean
  station?: StationResponse | null
  onClose: () => void
  onSaved: (station: StationResponse) => void
}

function draftFor(station?: StationResponse | null): StationDraft {
  return {
    stationName: station?.stationName ?? '',
    location: station?.location ?? '',
    latitude: station ? String(station.latitude) : '',
    longitude: station ? String(station.longitude) : '',
    capacityKwh: station ? String(station.capacityKwh) : '',
    batterySlotCount: station ? String(station.batterySlotCount) : '',
    type: station?.type ?? 'AC',
    schedule: {
      openTime: station?.operationalSchedule.openTime ?? '06:00',
      closeTime: station?.operationalSchedule.closeTime ?? '18:00',
      activeDays: station?.operationalSchedule.activeDays ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      dayHours: station?.operationalSchedule.dayHours ?? [],
    },
  }
}

export default function StationFormDialog({ open, station, onClose, onSaved }: StationFormDialogProps) {
  const creating = !station
  const [draft, setDraft] = useState<StationDraft>(() => draftFor(station))
  const [touched, setTouched] = useState(false)

  const save = useApiMutation((value: StationDraft) => {
    const body = {
      stationName: value.stationName.trim(),
      location: value.location.trim(),
      latitude: Number(value.latitude),
      longitude: Number(value.longitude),
      capacityKwh: Number(value.capacityKwh),
      batterySlotCount: Number(value.batterySlotCount),
      type: value.type,
    }
    return creating
      ? stationService.create({ ...body, operationalSchedule: value.schedule })
      : stationService.update(station!.id, { ...body, expectedUpdatedAt: station!.updatedAt })
  })

  const errors = touched ? validateStationDraft(draft, creating) : {}
  const set = <K extends keyof StationDraft>(key: K, value: StationDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const coordinates =
    draft.latitude.trim() !== '' && draft.longitude.trim() !== '' && Number.isFinite(Number(draft.latitude)) && Number.isFinite(Number(draft.longitude))
      ? { lat: Number(draft.latitude), lng: Number(draft.longitude) }
      : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(validateStationDraft(draft, creating)).length > 0) return
    const saved = await save.run(draft)
    if (saved) onSaved(saved)
  }

  return (
    <Dialog
      open={open}
      size="md"
      title={creating ? 'Register a microgrid node' : `Edit ${station!.stationName}`}
      busy={save.loading}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={save.loading} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="station-form" loading={save.loading}>
            {creating ? 'Register station' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="station-form" noValidate onSubmit={submit} className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
        <TextField label="Station name" required value={draft.stationName} error={errors.stationName} onChange={(e) => set('stationName', e.target.value)} containerClassName="sm:col-span-2" />
        <TextField label="Address" required value={draft.location} error={errors.location} onChange={(e) => set('location', e.target.value)} containerClassName="sm:col-span-2" />

        {isMapsConfigured() && (
          <div className="sm:col-span-2">
            <StationLocationPicker
              value={coordinates}
              address={draft.location}
              onAddressFound={(address) => set('location', address)}
              onChange={({ lat, lng }) => setDraft((current) => ({ ...current, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))}
            />
          </div>
        )}

        <TextField label="Latitude" required inputMode="decimal" value={draft.latitude} error={errors.latitude} onChange={(e) => set('latitude', e.target.value)} hint={isMapsConfigured() ? 'Filled in from the map.' : 'e.g. 6.927079'} />
        <TextField label="Longitude" required inputMode="decimal" value={draft.longitude} error={errors.longitude} onChange={(e) => set('longitude', e.target.value)} hint={isMapsConfigured() ? undefined : 'e.g. 79.861244'} />
        <TextField label="Capacity (kWh)" required type="number" min={0} step="any" value={draft.capacityKwh} error={errors.capacityKwh} onChange={(e) => set('capacityKwh', e.target.value)} />
        <TextField label="Battery bays" required type="number" min={1} step={1} value={draft.batterySlotCount} error={errors.batterySlotCount} onChange={(e) => set('batterySlotCount', e.target.value)} hint="How many bookings one slot can hold." />
        <SelectField label="Type" value={draft.type} onChange={(e) => set('type', e.target.value as StationType)}>
          <option value="AC">AC</option>
          <option value="DC">DC</option>
        </SelectField>

        {creating && (
          <div className="sm:col-span-2">
            <ScheduleFields value={draft.schedule} onChange={(schedule) => set('schedule', schedule)} error={errors.schedule} />
          </div>
        )}

        <ErrorAlert error={save.error} className="sm:col-span-2" />
      </form>
    </Dialog>
  )
}
