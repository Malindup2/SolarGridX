/*
 * SlotsPage.tsx
 * Booking slots for one station and day (Grid Operator). Generate a day from
 * the station's hours, add or edit single slots, take them offline (one at a
 * time or in bulk for maintenance) and delete unbooked ones.
 * Operators aren't assigned to a station, so the page starts with a picker.
 */

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorAlert,
  Icon,
  PageHeader,
  StatusBadge,
  TextField,
  type Column,
} from '../../components/ui'
import { useApiMutation } from '../../hooks/useApiMutation'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatKwh, isoDate } from '../../lib/format'
import { slotService } from '../../services/slotService'
import { stationService } from '../../services/stationService'
import type { SlotResponse } from '../../types/slot'
import StationPicker from '../reservations/components/StationPicker'
import SlotFormDialog from './SlotFormDialog'
import { slotsForDay } from './slotRules'

export default function SlotsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const stationId = searchParams.get('stationId') ?? ''
  const day = searchParams.get('date') ?? isoDate(0)

  const [editing, setEditing] = useState<SlotResponse | null | 'new'>(null)
  const [deleting, setDeleting] = useState<SlotResponse | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const station = useApiQuery((signal) => stationService.getById(stationId, signal), [stationId], { enabled: Boolean(stationId) })
  const slots = useApiQuery((signal) => slotService.forStation(stationId, signal), [stationId], { enabled: Boolean(stationId) })

  const generate = useApiMutation(() => slotService.generate(stationId, day))
  const toggle = useApiMutation((slot: SlotResponse) => slotService.setAvailability(slot.id, !slot.isAvailable))
  const bulk = useApiMutation((ids: string[], available: boolean) => slotService.setBulkAvailability(ids, available))
  const remove = useApiMutation((id: string) => slotService.remove(id))

  const rows = useMemo(() => (slots.data ? slotsForDay(slots.data, day) : null), [slots.data, day])
  const bays = station.data?.batterySlotCount ?? 0

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
    setSelected(new Set())
  }

  const refresh = () => {
    setSelected(new Set())
    slots.reload()
  }

  const runGenerate = async () => {
    const created = await generate.run()
    if (created) {
      toast.success(`${created.length} slots created for ${day}.`)
      refresh()
    }
  }

  const runToggle = async (slot: SlotResponse) => {
    const result = await toggle.run(slot)
    if (result) {
      toast.success(`${result.startTime}–${result.endTime} is ${result.isAvailable ? 'online' : 'offline'}.`)
      refresh()
    } else {
      toast.error('The slot could not be changed. Refresh and try again.')
    }
  }

  const runBulk = async (available: boolean) => {
    const ids = [...selected]
    if ((await bulk.run(ids, available)) === null) {
      toast.error('The slots could not be changed.')
      return
    }
    toast.success(`${ids.length} slot${ids.length === 1 ? '' : 's'} ${available ? 'back online' : 'taken offline'}.`)
    refresh()
  }

  const runDelete = async () => {
    if (!deleting || (await remove.run(deleting.id)) === null) return
    toast.success('Slot deleted.')
    setDeleting(null)
    refresh()
  }

  const toggleSelected = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const allSelected = Boolean(rows?.length) && rows!.every((slot) => selected.has(slot.id))

  const columns: Column<SlotResponse>[] = [
    {
      key: 'select',
      header: 'Select',
      render: (slot) => (
        <input
          type="checkbox"
          className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
          checked={selected.has(slot.id)}
          onChange={() => toggleSelected(slot.id)}
          aria-label={`Select ${slot.startTime}–${slot.endTime}`}
        />
      ),
    },
    { key: 'time', header: 'Time (Sri Lanka)', render: (slot) => <span className="tabular-nums font-semibold">{slot.startTime}–{slot.endTime}</span> },
    { key: 'capacity', header: 'Per booking', align: 'right', render: (slot) => `up to ${formatKwh(slot.capacityKwh)}` },
    {
      key: 'bays',
      header: 'Bays taken',
      align: 'right',
      render: (slot) => (bays ? `${slot.reservedCount} of ${bays}` : slot.reservedCount),
    },
    { key: 'state', header: 'State', render: (slot) => <StatusBadge status={slot.isAvailable ? 'Active' : 'Inactive'} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (slot) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => runToggle(slot)} disabled={toggle.loading}>
            {slot.isAvailable ? 'Take offline' : 'Bring online'}
          </Button>
          <Button variant="ghost" size="sm" icon={<Icon name="edit" size={16} />} onClick={() => setEditing(slot)} aria-label={`Edit ${slot.startTime}–${slot.endTime}`}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Icon name="trash" size={16} />}
            disabled={slot.reservedCount > 0}
            title={slot.reservedCount > 0 ? 'Booked slots cannot be deleted' : undefined}
            onClick={() => {
              remove.reset()
              setDeleting(slot)
            }}
            aria-label={`Delete ${slot.startTime}–${slot.endTime}`}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Slots"
        subtitle="One-hour energy transfer slots per station. Times are Sri Lanka time, like the station schedule."
        actions={
          stationId && (
            <>
              <Button variant="secondary" icon={<Icon name="plus" size={18} />} onClick={() => setEditing('new')}>
                Add slot
              </Button>
              <Button icon={<Icon name="bolt" size={18} />} loading={generate.loading} onClick={runGenerate}>
                Generate this day
              </Button>
            </>
          )
        }
      />

      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <StationPicker remember value={stationId} onChange={(id) => setParam('stationId', id)} />
          <TextField label="Day" type="date" value={day} onChange={(e) => setParam('date', e.target.value)} />
        </div>
        {station.data && (
          <p className="mt-3 text-caption text-[var(--color-muted)]">
            {station.data.stationName} operates {station.data.operationalSchedule.openTime}–{station.data.operationalSchedule.closeTime} (Sri Lanka time) on{' '}
            {station.data.operationalSchedule.activeDays.join(', ')} · {bays} battery bays.
          </p>
        )}
      </Card>

      <ErrorAlert error={generate.error} onDismiss={generate.reset} className="mb-6" />
      <ErrorAlert error={slots.error ?? station.error} onRetry={refresh} className="mb-6" />

      {!stationId ? (
        <Card>
          <EmptyState title="Pick a station" description="Slots belong to a station. Choose one to see and manage its day." icon={<Icon name="pin" size={24} />} />
        </Card>
      ) : (
        <Card padded={false}>
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-5 py-3" role="region" aria-label="Bulk actions">
              <span className="text-sm font-semibold text-[var(--color-ink)]">{selected.size} selected</span>
              <Button size="sm" variant="secondary" loading={bulk.loading} onClick={() => runBulk(false)}>
                Take offline (maintenance)
              </Button>
              <Button size="sm" variant="secondary" loading={bulk.loading} onClick={() => runBulk(true)}>
                Bring online
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          )}
          {rows && rows.length > 0 && (
            <label className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3 text-caption text-[var(--color-muted)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-primary)]"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((slot) => slot.id)))}
              />
              Select all {rows.length} slots on {day}
            </label>
          )}
          <DataTable
            caption={`Slots on ${day}`}
            columns={columns}
            rows={rows}
            loading={slots.loading}
            rowKey={(slot) => slot.id}
            empty={
              <EmptyState
                title="No slots on this day"
                description="Generate the day from the station's operating hours, or add a slot by hand."
                action={
                  <Button loading={generate.loading} onClick={runGenerate}>
                    Generate this day
                  </Button>
                }
              />
            }
          />
        </Card>
      )}

      {editing && stationId && (
        <SlotFormDialog
          open
          stationId={stationId}
          date={day}
          slot={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            toast.success(editing === 'new' ? `Slot ${saved.startTime}–${saved.endTime} added.` : 'Slot updated.')
            setEditing(null)
            refresh()
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.startTime ?? ''}–${deleting?.endTime ?? ''}?`}
        message="Only slots without bookings can be deleted."
        confirmLabel="Delete slot"
        busy={remove.loading}
        onConfirm={runDelete}
        onCancel={() => setDeleting(null)}
      >
        <ErrorAlert error={remove.error} />
      </ConfirmDialog>
    </>
  )
}
