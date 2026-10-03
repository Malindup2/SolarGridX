/*
 * NewReservationPage.tsx
 * Assisted booking: a grid operator books a slot on a prosumer's behalf (for
 * example when the prosumer phones in). Prosumer → station → day and slot →
 * energy → review → confirm. Every reservation rule (7-day window, active
 * prosumer, capacity, bays) is enforced by the API on submit.
 * POST /reservations
 */

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, ErrorAlert, PageHeader, SelectField, TextField } from '../../components/ui'
import { useApiMutation } from '../../hooks/useApiMutation'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatKwh, formatSlotDate, isoDate } from '../../lib/format'
import { prosumerService } from '../../services/prosumerService'
import { reservationService } from '../../services/reservationService'
import { stationService } from '../../services/stationService'
import type { SlotResponse } from '../../types/slot'
import SlotChooser from './components/SlotChooser'
import StationPicker from './components/StationPicker'
import type { SummaryState } from './components/useReservationActions'

const BOOKING_WINDOW_DAYS = 7

export default function NewReservationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [nic, setNic] = useState(searchParams.get('nic') ?? '')
  const [prosumerQuery, setProsumerQuery] = useState('')
  const [stationId, setStationId] = useState(searchParams.get('stationId') ?? '')
  const [day, setDay] = useState(isoDate(1))
  const [slot, setSlot] = useState<SlotResponse | null>(null)
  const [energy, setEnergy] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const prosumers = useApiQuery((signal) => prosumerService.list('Active', signal), [])
  const station = useApiQuery((signal) => stationService.getById(stationId, signal), [stationId], { enabled: Boolean(stationId) })
  const create = useApiMutation(() =>
    reservationService.create({
      nic,
      stationId,
      slotId: slot!.id,
      reservationDate: slot!.slotDate.slice(0, 10),
      startTime: slot!.startTime,
      endTime: slot!.endTime,
      energyKwh: Number(energy),
    }),
  )

  const matches = useMemo(() => {
    const q = prosumerQuery.trim().toLowerCase()
    return (prosumers.data ?? []).filter((p) => !q || p.nic.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q)).slice(0, 50)
  }, [prosumers.data, prosumerQuery])
  const prosumer = prosumers.data?.find((p) => p.nic === nic) ?? null

  const energyValue = Number(energy)
  const energyError =
    energy && (!Number.isFinite(energyValue) || energyValue <= 0)
      ? 'Enter more than 0 kWh.'
      : slot && energyValue > slot.capacityKwh
        ? `This slot allows up to ${formatKwh(slot.capacityKwh)} per booking.`
        : null
  const ready = Boolean(prosumer && stationId && slot && energy && !energyError)

  const confirm = async () => {
    const created = await create.run()
    if (!created) return
    const state: SummaryState = { action: 'created', reservation: created }
    navigate(`/reservations/${encodeURIComponent(created.id)}/summary`, { state })
  }

  if (reviewing && ready) {
    return (
      <>
        <PageHeader title="Check and confirm" breadcrumbs={[{ label: 'Reservations', to: '/reservations' }, { label: 'New reservation' }]} />
        <Card className="max-w-2xl">
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ['Prosumer', `${prosumer!.fullName} (${prosumer!.nic})`],
              ['Station', station.data?.stationName ?? ''],
              ['Day', formatSlotDate(slot!.slotDate)],
              ['Slot (Sri Lanka time)', `${slot!.startTime}–${slot!.endTime}`],
              ['Energy', formatKwh(energyValue)],
              ['Status after booking', 'Pending: an operator still approves it'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-caption font-semibold uppercase tracking-wide text-[var(--color-muted)]">{label}</dt>
                <dd className="mt-1 text-sm text-[var(--color-ink)]">{value}</dd>
              </div>
            ))}
          </dl>
          <ErrorAlert error={create.error} className="mt-5" />
          <div className="mt-6 flex gap-2">
            <Button loading={create.loading} onClick={confirm}>
              Book for {prosumer!.fullName.split(' ')[0]}
            </Button>
            <Button variant="ghost" disabled={create.loading} onClick={() => setReviewing(false)}>
              Back
            </Button>
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="New reservation"
        subtitle="Book a slot on a prosumer's behalf. They are notified, and it waits in Pending for approval like any booking."
        breadcrumbs={[{ label: 'Reservations', to: '/reservations' }, { label: 'New reservation' }]}
      />

      <div className="space-y-6">
        <Card title="1. Prosumer">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Find a prosumer" placeholder="Name or NIC" value={prosumerQuery} onChange={(e) => setProsumerQuery(e.target.value)} autoComplete="off" />
            <SelectField
              label="Prosumer (active accounts only)"
              value={nic}
              disabled={prosumers.loading}
              error={prosumers.error?.message}
              onChange={(e) => setNic(e.target.value)}
            >
              <option value="">{prosumers.loading ? 'Loading…' : `Select (${matches.length} match)`}</option>
              {prosumer && !matches.includes(prosumer) && <option value={prosumer.nic}>{prosumer.fullName} · {prosumer.nic}</option>}
              {matches.map((p) => (
                <option key={p.nic} value={p.nic}>
                  {p.fullName} · {p.nic}
                </option>
              ))}
            </SelectField>
          </div>
        </Card>

        <Card title="2. Station and slot">
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <StationPicker
              value={stationId}
              onChange={(id) => {
                setStationId(id)
                setSlot(null)
              }}
            />
            <TextField
              label="Day"
              type="date"
              min={isoDate(0)}
              max={isoDate(BOOKING_WINDOW_DAYS)}
              value={day}
              hint="Bookings can be made up to 7 days ahead."
              onChange={(e) => {
                setDay(e.target.value)
                setSlot(null)
              }}
            />
          </div>
          <SlotChooser stationId={stationId} day={day} bays={station.data?.batterySlotCount ?? 0} value={slot} onChange={setSlot} />
        </Card>

        <Card title="3. Energy">
          <TextField
            label="Energy to transfer (kWh)"
            type="number"
            min={0}
            step="any"
            value={energy}
            error={energyError}
            hint={slot ? `Up to ${formatKwh(slot.capacityKwh)} in this slot.` : 'Pick a slot to see its limit.'}
            onChange={(e) => setEnergy(e.target.value)}
            containerClassName="max-w-xs"
          />
        </Card>

        <div className="flex gap-2">
          <Button disabled={!ready} onClick={() => setReviewing(true)}>
            Review booking
          </Button>
          <Button variant="ghost" onClick={() => navigate('/reservations')}>
            Cancel
          </Button>
        </div>
      </div>
    </>
  )
}
