/*
 * StationDetailsPage.tsx
 * One microgrid node: facts, operating schedule, and the lifecycle actions.
 *   Backoffice: edit, activate / deactivate, delete
 *   Both staff: change the schedule, jump to slots and bookings
 * Deactivation is refused while Pending/Approved bookings exist (BR-04); the
 * API lists them and this page shows that list. Delete is refused while slots
 * or reservations reference the node (BR-22).
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AuditHistory from '../../components/AuditHistory'
import ScheduleFields from '../../components/stations/ScheduleFields'
import { describeHours, validateSchedule, WEEKDAYS, type ScheduleDraft } from '../../components/stations/stationRules'
import StationFormDialog from '../../components/stations/StationFormDialog'
import { Button, Card, ConfirmDialog, Dialog, ErrorAlert, Icon, PageHeader, Skeleton, StatusBadge } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useApiMutation } from '../../hooks/useApiMutation'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatDateTime, formatKwh } from '../../lib/format'
import { stationService } from '../../services/stationService'

type Confirm = 'activate' | 'deactivate' | 'delete' | null

export default function StationDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const isBackoffice = auth?.role === 'Backoffice'
  const isOperator = auth?.role === 'GridOperator'

  const [editing, setEditing] = useState(false)
  const [schedule, setSchedule] = useState<ScheduleDraft | null>(null)
  const [scheduleTouched, setScheduleTouched] = useState(false)
  const [confirm, setConfirm] = useState<Confirm>(null)

  const station = useApiQuery((signal) => stationService.getById(id, signal), [id])
  const activate = useApiMutation(() => stationService.activate(id))
  const deactivate = useApiMutation(() => stationService.deactivate(id))
  const remove = useApiMutation(() => stationService.delete(id))
  const saveSchedule = useApiMutation((value: ScheduleDraft) => stationService.updateSchedule(id, value, station.data?.updatedAt))

  const s = station.data
  const busy = activate.loading || deactivate.loading || remove.loading
  const confirmError = confirm === 'activate' ? activate.error : confirm === 'deactivate' ? deactivate.error : remove.error
  const scheduleError = scheduleTouched && schedule ? validateSchedule(schedule) : null

  const openConfirm = (kind: Confirm) => {
    activate.reset()
    deactivate.reset()
    remove.reset()
    setConfirm(kind)
  }

  const runConfirmed = async () => {
    if (confirm === 'delete') {
      if ((await remove.run()) === null) return
      toast.success(`${s?.stationName ?? 'Station'} was removed.`)
      navigate('/stations', { replace: true })
      return
    }

    const result = confirm === 'activate' ? await activate.run() : await deactivate.run()
    if (!result) return
    toast.success(confirm === 'activate' ? `${result.stationName} is active.` : `${result.stationName} was deactivated.`)
    setConfirm(null)
    station.reload()
  }

  const submitSchedule = async () => {
    setScheduleTouched(true)
    if (!schedule || validateSchedule(schedule)) return
    const result = await saveSchedule.run(schedule)
    if (!result) return
    toast.success('Operating schedule updated.')
    setSchedule(null)
    station.reload()
  }

  return (
    <>
      <PageHeader
        title={s?.stationName ?? 'Station'}
        breadcrumbs={[{ label: 'Stations', to: '/stations' }, { label: s?.stationName ?? id }]}
        subtitle={s ? <StatusBadge status={s.status} /> : undefined}
        actions={
          s && (
            <>
              {isOperator && (
                <Link to={`/slots?stationId=${encodeURIComponent(s.id)}`} className="focus-ring inline-flex h-9 items-center rounded-full border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-background)]">
                  Manage slots
                </Link>
              )}
              {isBackoffice && (
                <>
                  <Button variant="secondary" size="sm" icon={<Icon name="edit" size={16} />} onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  {s.status === 'Active' ? (
                    <Button variant="secondary" size="sm" icon={<Icon name="power" size={16} />} onClick={() => openConfirm('deactivate')}>
                      Deactivate
                    </Button>
                  ) : (
                    <Button size="sm" icon={<Icon name="check" size={16} />} onClick={() => openConfirm('activate')}>
                      Activate
                    </Button>
                  )}
                  <Button variant="danger" size="sm" icon={<Icon name="trash" size={16} />} onClick={() => openConfirm('delete')}>
                    Delete
                  </Button>
                </>
              )}
            </>
          )
        }
      />

      <ErrorAlert error={station.error} onRetry={station.reload} className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card
            title="Details"
            actions={
              s && (
                <Link to={`/reservations?stationId=${encodeURIComponent(s.id)}`} className="focus-ring rounded text-sm font-semibold text-[var(--color-primary-hover)] hover:underline">
                  View bookings
                </Link>
              )
            }
          >
            {!s && station.loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              s && (
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {[
                    ['Address', s.location],
                    ['GPS', `${s.latitude.toFixed(6)}, ${s.longitude.toFixed(6)}`],
                    ['Capacity', formatKwh(s.capacityKwh)],
                    ['Battery bays', `${s.batterySlotCount} (bookings one slot can hold)`],
                    ['Type', s.type],
                    ['Registered', formatDateTime(s.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-caption font-semibold uppercase tracking-wide text-[var(--color-muted)]">{label}</dt>
                      <dd className="mt-1 text-sm text-[var(--color-ink)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              )
            )}
          </Card>

          <Card
            title="Operating schedule"
            actions={
              s &&
              !schedule && (
                <Button variant="ghost" size="sm" icon={<Icon name="edit" size={16} />} onClick={() => { saveSchedule.reset(); setScheduleTouched(false); setSchedule(s.operationalSchedule) }}>
                  Change
                </Button>
              )
            }
          >
            {s && !schedule && (
              <ul className="space-y-1 text-sm text-[var(--color-ink)]" aria-label="Opening hours by day (Sri Lanka time)">
                {WEEKDAYS.filter((day) => s.operationalSchedule.activeDays.includes(day)).map((day) => (
                  <li key={day} className="flex justify-between gap-4">
                    <span>{day}</span>
                    <span className="tabular-nums">
                      {describeHours(s.operationalSchedule, day)}
                      {s.operationalSchedule.dayHours.some((d) => d.day === day) && (
                        <span className="ml-2 text-caption text-[var(--color-muted)]">special hours</span>
                      )}
                    </span>
                  </li>
                ))}
                <li className="pt-1 text-caption text-[var(--color-muted)]">Times are Sri Lanka time. Other days are closed.</li>
              </ul>
            )}
            {schedule && (
              <div className="space-y-4">
                <ScheduleFields value={schedule} onChange={setSchedule} error={scheduleError} />
                <ErrorAlert
                  error={saveSchedule.error}
                  onRetry={saveSchedule.error?.code === 'STATION_CHANGED' ? () => { setSchedule(null); station.reload() } : undefined}
                />
                <div className="flex gap-2">
                  <Button loading={saveSchedule.loading} onClick={submitSchedule}>
                    Save schedule
                  </Button>
                  <Button variant="ghost" disabled={saveSchedule.loading} onClick={() => setSchedule(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {s && <AuditHistory kind="stations" id={s.id} title="Station history" />}
      </div>

      {editing && s && (
        <StationFormDialog
          open
          station={s}
          onClose={() => setEditing(false)}
          onSaved={() => {
            toast.success('Changes saved.')
            setEditing(false)
            station.reload()
          }}
        />
      )}

      {/* A blocked deactivation lists the bookings in the way (BR-04), so it gets a roomier dialog. */}
      {confirm === 'deactivate' && deactivate.error?.code === 'STATION_HAS_ACTIVE_RESERVATIONS' ? (
        <Dialog
          open
          size="md"
          title="This station still has bookings"
          description="Pending or approved reservations block deactivation. Cancel or complete these first:"
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Close
              </Button>
              <Link
                to={`/reservations?stationId=${encodeURIComponent(id)}`}
                className="focus-ring inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white"
              >
                Review bookings
              </Link>
            </>
          }
        >
          <ul className="max-h-60 space-y-1 overflow-y-auto text-sm text-[var(--color-ink)]">
            {deactivate.error.details.map((detail) => (
              <li key={detail} className="rounded-[var(--radius-sm)] bg-[var(--color-background)] px-3 py-2">
                {detail}
              </li>
            ))}
          </ul>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={confirm !== null}
          tone={confirm === 'activate' ? 'primary' : 'danger'}
          title={
            confirm === 'activate'
              ? `Activate ${s?.stationName ?? 'this station'}?`
              : confirm === 'deactivate'
                ? `Deactivate ${s?.stationName ?? 'this station'}?`
                : `Delete ${s?.stationName ?? 'this station'}?`
          }
          message={
            confirm === 'activate'
              ? 'Prosumers can book it again.'
              : confirm === 'deactivate'
                ? 'It stops taking new bookings. Existing pending or approved bookings block this.'
                : 'Only a station with no slots and no bookings can be deleted. This cannot be undone.'
          }
          confirmLabel={confirm === 'activate' ? 'Activate' : confirm === 'deactivate' ? 'Deactivate' : 'Delete station'}
          busy={busy}
          onConfirm={runConfirmed}
          onCancel={() => setConfirm(null)}
        >
          <ErrorAlert error={confirmError} />
        </ConfirmDialog>
      )}
    </>
  )
}
