/*
 * ReservationChangeActions.tsx
 * Grid operator changes to a Pending booking on the prosumer's behalf:
 * edit the energy (PUT /reservations/{id}) or move it to another slot
 * (PATCH /reservations/{id}/reschedule). Both need 12 hours' notice (BR-02);
 * the API says so if it's too late, and that message is shown.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, ErrorAlert, TextField } from '../../../components/ui'
import { useApiMutation } from '../../../hooks/useApiMutation'
import { useApiQuery } from '../../../hooks/useApiQuery'
import { formatKwh, isoDate, slotDayKey } from '../../../lib/format'
import { reservationService } from '../../../services/reservationService'
import { stationService } from '../../../services/stationService'
import type { ReservationAction, ReservationResponse } from '../../../types/reservation'
import type { SlotResponse } from '../../../types/slot'
import SlotChooser from './SlotChooser'
import StationPicker from './StationPicker'
import type { SummaryState } from './useReservationActions'

interface ReservationChangeActionsProps {
  reservation: ReservationResponse
  /** Reload the reservation, after someone else changed it while this editor was open. */
  onStale?: () => void
}

/** Why the user is told this before changing an approved booking. */
export const REAPPROVAL_NOTE =
  'This booking is approved. Changing it sends it back to Pending for approval again, and its QR code stops working.'

export default function ReservationChangeActions({ reservation, onStale }: ReservationChangeActionsProps) {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'energy' | 'move' | null>(null)
  const [energy, setEnergy] = useState(String(reservation.energyKwh))
  const [stationId, setStationId] = useState(reservation.stationId)
  const [day, setDay] = useState(slotDayKey(reservation.reservationDate))
  const [slot, setSlot] = useState<SlotResponse | null>(null)

  const station = useApiQuery((signal) => stationService.getById(stationId, signal), [stationId], { enabled: dialog === 'move' && Boolean(stationId) })
  // The version the page loaded is sent back, so a change made by someone else meanwhile is not overwritten.
  const updateEnergy = useApiMutation((value: number) => reservationService.updateEnergy(reservation.id, value, reservation.updatedAt))
  const reschedule = useApiMutation((slotId: string) => reservationService.reschedule(reservation.id, slotId, reservation.updatedAt))
  const approved = reservation.status === 'Approved'

  const loadLatest = () => {
    setDialog(null)
    onStale?.()
  }

  const done = (action: ReservationAction, result: ReservationResponse | null) => {
    if (!result) return
    setDialog(null)
    const state: SummaryState = { action, reservation: result }
    navigate(`/reservations/${encodeURIComponent(result.id)}/summary`, { state })
  }

  const energyValue = Number(energy)
  const energyError = !Number.isFinite(energyValue) || energyValue <= 0 ? 'Enter more than 0 kWh.' : null

  return (
    <>
      <Button variant="secondary" onClick={() => { updateEnergy.reset(); setEnergy(String(reservation.energyKwh)); setDialog('energy') }}>
        Edit energy
      </Button>
      <Button variant="secondary" onClick={() => { reschedule.reset(); setSlot(null); setDialog('move') }}>
        Move to another slot
      </Button>

      <Dialog
        open={dialog === 'energy'}
        title="Change the energy booked"
        description={
          <>
            {`Currently ${formatKwh(reservation.energyKwh)}. It can't go above what the slot allows per booking.`}
            {approved && <span className="mt-2 block font-medium text-[var(--color-status-pending)]">{REAPPROVAL_NOTE}</span>}
          </>
        }
        busy={updateEnergy.loading}
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button variant="secondary" disabled={updateEnergy.loading} onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              loading={updateEnergy.loading}
              disabled={Boolean(energyError) || energyValue === reservation.energyKwh}
              onClick={async () => done('updated', await updateEnergy.run(energyValue))}
            >
              Save
            </Button>
          </>
        }
      >
        <TextField label="Energy (kWh)" type="number" min={0} step="any" value={energy} error={energy ? energyError : null} onChange={(e) => setEnergy(e.target.value)} />
        <ErrorAlert
          error={updateEnergy.error}
          onRetry={updateEnergy.error?.code === 'RESERVATION_CHANGED' ? loadLatest : undefined}
          className="mt-3"
        />
      </Dialog>

      <Dialog
        open={dialog === 'move'}
        size="md"
        title="Move to another slot"
        description={
          <>
            Pick the new slot. The old battery bay is released once it moves.
            {approved && <span className="mt-2 block font-medium text-[var(--color-status-pending)]">{REAPPROVAL_NOTE}</span>}
          </>
        }
        busy={reschedule.loading}
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button variant="secondary" disabled={reschedule.loading} onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button loading={reschedule.loading} disabled={!slot} onClick={async () => done('rescheduled', await reschedule.run(slot!.id))}>
              Move booking
            </Button>
          </>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <StationPicker value={stationId} onChange={(id) => { setStationId(id); setSlot(null) }} />
          <TextField label="Day" type="date" min={isoDate(0)} max={isoDate(7)} value={day} onChange={(e) => { setDay(e.target.value); setSlot(null) }} />
        </div>
        <SlotChooser stationId={stationId} day={day} bays={station.data?.batterySlotCount ?? 0} value={slot} onChange={setSlot} excludeSlotId={reservation.slotId} />
        <ErrorAlert
          error={reschedule.error}
          onRetry={reschedule.error?.code === 'RESERVATION_CHANGED' ? loadLatest : undefined}
          className="mt-3"
        />
      </Dialog>
    </>
  )
}
