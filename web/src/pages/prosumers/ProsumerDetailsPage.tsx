/*
 * ProsumerDetailsPage.tsx
 * One prosumer: contact details, booking counts, and (Backoffice) edit,
 * activate / deactivate and the account's history. Only the Backoffice can
 * reactivate a deactivated account (BR-05).
 * GET /prosumers/{nic}, GET /dashboard/prosumer/{nic}
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useParams } from 'react-router-dom'
import AuditHistory from '../../components/AuditHistory'
import { Button, Card, ConfirmDialog, ErrorAlert, Icon, PageHeader, Skeleton, StatCard, StatusBadge } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useApiMutation } from '../../hooks/useApiMutation'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatDateTime } from '../../lib/format'
import { prosumerService } from '../../services/prosumerService'
import { reservationService } from '../../services/reservationService'
import ProsumerFormDialog from './ProsumerFormDialog'

export default function ProsumerDetailsPage() {
  const { nic = '' } = useParams()
  const { auth } = useAuth()
  const isBackoffice = auth?.role === 'Backoffice'
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState<'activate' | 'deactivate' | null>(null)

  const prosumer = useApiQuery((signal) => prosumerService.get(nic, signal), [nic])
  const counts = useApiQuery((signal) => reservationService.prosumerDashboard(nic, signal), [nic])
  const activate = useApiMutation(() => prosumerService.activate(nic))
  const deactivate = useApiMutation(() => prosumerService.deactivate(nic))

  const p = prosumer.data
  const busy = activate.loading || deactivate.loading
  const actionError = confirm === 'activate' ? activate.error : deactivate.error

  const runConfirmed = async () => {
    const result = confirm === 'activate' ? await activate.run() : await deactivate.run()
    if (!result) return
    toast.success(confirm === 'activate' ? `${result.fullName} is active.` : `${result.fullName} was deactivated.`)
    setConfirm(null)
    prosumer.reload()
  }

  return (
    <>
      <PageHeader
        title={p?.fullName ?? 'Prosumer'}
        breadcrumbs={[{ label: 'Prosumers', to: '/prosumers' }, { label: nic }]}
        subtitle={p ? <StatusBadge status={p.status} /> : undefined}
        actions={
          p &&
          isBackoffice && (
            <>
              <Button variant="secondary" icon={<Icon name="edit" size={16} />} onClick={() => setEditing(true)}>
                Edit
              </Button>
              {p.status === 'Active' ? (
                <Button variant="danger" icon={<Icon name="power" size={16} />} onClick={() => { deactivate.reset(); setConfirm('deactivate') }}>
                  Deactivate
                </Button>
              ) : (
                <Button icon={<Icon name="check" size={16} />} onClick={() => { activate.reset(); setConfirm('activate') }}>
                  {p.status === 'Pending' ? 'Activate' : 'Reactivate'}
                </Button>
              )}
            </>
          )
        }
      />

      <ErrorAlert error={prosumer.error} onRetry={prosumer.reload} className="mb-6" />

      {p?.status === 'Pending' && isBackoffice && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-status-pending)]/40 bg-[color-mix(in_srgb,var(--color-status-pending)_8%,var(--color-surface))] p-4 text-sm text-[var(--color-ink)]">
          This prosumer registered on the mobile app and is waiting for activation. They can sign in, but cannot book until you activate the account.
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active bookings" icon={<Icon name="bolt" />} value={counts.data?.activeCount ?? '—'} loading={counts.loading} />
        <StatCard label="Waiting for review" tone="pending" icon={<Icon name="hourglass" />} value={counts.data?.pendingCount ?? '—'} loading={counts.loading} />
        <StatCard label="Approved, upcoming" tone="approved" icon={<Icon name="calendar" />} value={counts.data?.approvedFutureCount ?? '—'} loading={counts.loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card
          title="Contact details"
          actions={
            <Link to={`/reservations?nic=${encodeURIComponent(nic)}`} className="focus-ring rounded text-sm font-semibold text-[var(--color-primary-hover)] hover:underline">
              View reservations
            </Link>
          }
        >
          {!p && prosumer.loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            p && (
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {[
                  ['NIC', p.nic],
                  ['Email', p.email],
                  ['Phone', p.phone || '—'],
                  ['Address', p.address || '—'],
                  ['Registered', formatDateTime(p.createdAt)],
                  ['Last updated', formatDateTime(p.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-caption font-semibold uppercase tracking-wide text-[var(--color-muted)]">{label}</dt>
                    <dd className="mt-1 text-sm text-[var(--color-ink)]">{value}</dd>
                  </div>
                ))}
              </dl>
            )
          )}
        </Card>

        {isBackoffice && <AuditHistory kind="users" id={nic} title="Account history" />}
      </div>

      {editing && p && (
        <ProsumerFormDialog
          open
          prosumer={p}
          onClose={() => setEditing(false)}
          onSaved={() => {
            toast.success('Changes saved.')
            setEditing(false)
            prosumer.reload()
          }}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        tone={confirm === 'activate' ? 'primary' : 'danger'}
        title={confirm === 'activate' ? `Activate ${p?.fullName ?? 'this prosumer'}?` : `Deactivate ${p?.fullName ?? 'this prosumer'}?`}
        message={
          confirm === 'activate'
            ? 'They can book energy transfers straight away and are told by email.'
            : 'They are signed out and cannot sign in again until the Backoffice reactivates the account.'
        }
        confirmLabel={confirm === 'activate' ? 'Activate' : 'Deactivate'}
        busy={busy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      >
        <ErrorAlert error={actionError} />
      </ConfirmDialog>
    </>
  )
}
