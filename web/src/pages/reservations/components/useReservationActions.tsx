/*
 * useReservationActions.tsx
 * Approve / reject / cancel with their confirmation dialogs. On success the
 * user lands on the summary page with the response of the call just made.
 *
 * Which buttons show is a convenience only: the API decides (409 once a
 * reservation is decided, 403 for the wrong role) and its error is shown.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog, ErrorAlert, TextAreaField } from '../../../components/ui'
import { useAuth } from '../../../context/AuthContext'
import { useApiMutation } from '../../../hooks/useApiMutation'
import { formatSlotDate, formatSlotTime } from '../../../lib/format'
import { reservationService } from '../../../services/reservationService'
import type { ReservationAction, ReservationResponse } from '../../../types/reservation'

const REASON_MAX = 500

type PendingAction = { kind: ReservationAction; reservation: ReservationResponse } | null

export interface SummaryState {
  action: ReservationAction
  reservation: ReservationResponse
}

interface ReservationActionOptions {
  /** Called when a dialog closes after a failed call, so the page can refetch stale data. */
  onStale?: () => void
}

export function useReservationActions({ onStale }: ReservationActionOptions = {}) {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState<PendingAction>(null)
  const [reason, setReason] = useState('')
  const [reasonTouched, setReasonTouched] = useState(false)

  const approve = useApiMutation((id: string) => reservationService.approve(id))
  const reject = useApiMutation((id: string, why: string) => reservationService.reject(id, why))
  const cancel = useApiMutation((id: string) => reservationService.cancel(id))

  const isOperator = auth?.role === 'GridOperator'
  const isBackoffice = auth?.role === 'Backoffice'

  const can = (reservation: ReservationResponse) => ({
    approve: isOperator && reservation.status === 'Pending',
    reject: isOperator && reservation.status === 'Pending',
    cancel: isBackoffice && (reservation.status === 'Pending' || reservation.status === 'Approved'),
  })

  const open = (kind: ReservationAction, reservation: ReservationResponse) => {
    approve.reset()
    reject.reset()
    cancel.reset()
    setReason('')
    setReasonTouched(false)
    setPending({ kind, reservation })
  }


  const finish = (action: ReservationAction, result: ReservationResponse | null) => {
    if (!result) return
    setPending(null)
    const state: SummaryState = { action, reservation: result }
    navigate(`/reservations/${encodeURIComponent(result.id)}/summary`, { state })
  }

  const confirm = async () => {
    if (!pending) return
    const { kind, reservation } = pending
    if (kind === 'approved') finish(kind, await approve.run(reservation.id))
    if (kind === 'cancelled') finish(kind, await cancel.run(reservation.id))
    if (kind === 'rejected') {
      setReasonTouched(true)
      if (!reason.trim()) return
      finish(kind, await reject.run(reservation.id, reason))
    }
  }

  const busy = approve.loading || reject.loading || cancel.loading
  const error = pending?.kind === 'approved' ? approve.error : pending?.kind === 'rejected' ? reject.error : cancel.error
  const subject = pending
    ? `${pending.reservation.stationName} · ${formatSlotDate(pending.reservation.reservationDate)} · ${formatSlotTime(
        pending.reservation.startTime,
        pending.reservation.endTime,
      )}`
    : ''
  const close = () => {
    setPending(null)
    if (error) onStale?.()
  }

  const reasonError = reasonTouched && !reason.trim() ? 'Give the prosumer a reason.' : null

  const dialogs = (
    <>
      <ConfirmDialog
        open={pending?.kind === 'approved'}
        tone="primary"
        title="Approve this reservation?"
        message={`${subject}. A QR code is issued to the prosumer as soon as you approve.`}
        confirmLabel="Approve"
        busy={busy}
        onConfirm={confirm}
        onCancel={close}
      >
        <ErrorAlert error={error} />
      </ConfirmDialog>

      <ConfirmDialog
        open={pending?.kind === 'rejected'}
        title="Reject this reservation?"
        message={subject}
        confirmLabel="Reject"
        busy={busy}
        onConfirm={confirm}
        onCancel={close}
      >
        <div className="space-y-3">
          <TextAreaField
            label="Reason"
            required
            data-autofocus
            value={reason}
            maxLength={REASON_MAX}
            error={reasonError}
            hint={`${reason.length}/${REASON_MAX} · shown to the prosumer`}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setReasonTouched(true)}
          />
          <ErrorAlert error={error} />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={pending?.kind === 'cancelled'}
        title="Cancel this reservation?"
        message={`${subject}. The prosumer's battery bay is released. This cannot be undone.`}
        confirmLabel="Cancel reservation"
        cancelLabel="Keep it"
        busy={busy}
        onConfirm={confirm}
        onCancel={close}
      >
        <ErrorAlert error={error} />
      </ConfirmDialog>
    </>
  )

  return { can, open, dialogs }
}
