/*
 * ProsumersPage.tsx
 * Prosumer accounts with a status filter. "Pending" is the activation queue:
 * Backoffice activates straight from the row (BR-05). Operators can browse.
 * GET /prosumers, PATCH /prosumers/{nic}/activate, POST /prosumers
 */

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorAlert,
  ExportButton,
  FilterPills,
  Icon,
  PageHeader,
  StatusBadge,
  TextField,
  type Column,
} from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useApiMutation } from '../../hooks/useApiMutation'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatDateTime } from '../../lib/format'
import { prosumerService } from '../../services/prosumerService'
import type { UserStatus } from '../../types/auth'
import type { ProsumerResponse } from '../../types/prosumer'
import ProsumerFormDialog from './ProsumerFormDialog'
import { filterProsumers } from './prosumerRules'

const STATUSES: UserStatus[] = ['Pending', 'Active', 'Deactivated']

export default function ProsumersPage() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const isBackoffice = auth?.role === 'Backoffice'

  const statusParam = searchParams.get('status')
  const status = STATUSES.includes(statusParam as UserStatus) ? (statusParam as UserStatus) : ''

  const { data, error, loading, reload } = useApiQuery((signal) => prosumerService.list(undefined, signal), [])
  const activate = useApiMutation((nic: string) => prosumerService.activate(nic))

  const rows = useMemo(() => (data ? filterProsumers(data, query, status) : null), [data, query, status])
  const countFor = (value: UserStatus) => data?.filter((p) => p.status === value).length

  const setStatus = (value: UserStatus | '') => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('status', value)
    else next.delete('status')
    setSearchParams(next, { replace: true })
  }

  const quickActivate = async (prosumer: ProsumerResponse) => {
    const result = await activate.run(prosumer.nic)
    if (result) {
      toast.success(`${result.fullName} is active and has been told by email.`)
      reload()
    } else {
      toast.error('The account could not be activated. Open it to see why.')
    }
  }

  const columns: Column<ProsumerResponse>[] = [
    {
      key: 'name',
      header: 'Prosumer',
      render: (p) => (
        <div>
          <p className="font-semibold">{p.fullName}</p>
          <p className="text-caption text-[var(--color-muted)]">{p.email}</p>
        </div>
      ),
    },
    { key: 'nic', header: 'NIC', render: (p) => <span className="font-mono text-[13px]">{p.nic}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'registered', header: 'Registered', hideOnMobile: true, render: (p) => formatDateTime(p.createdAt) },
  ]

  if (isBackoffice) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) =>
        p.status === 'Active' ? null : (
          <Button
            size="sm"
            variant={p.status === 'Pending' ? 'primary' : 'secondary'}
            loading={activate.loading}
            onClick={(event) => {
              // The row itself opens the details page.
              event.stopPropagation()
              void quickActivate(p)
            }}
          >
            {p.status === 'Pending' ? 'Activate' : 'Reactivate'}
          </Button>
        ),
    })
  }

  return (
    <>
      <PageHeader
        title="Prosumers"
        subtitle={
          isBackoffice
            ? 'Solar prosumer accounts. New registrations wait in Pending until you activate them.'
            : 'Solar prosumer accounts registered on the grid.'
        }
        actions={
          <>
            <ExportButton kind="prosumers" filters={{ q: query, status }} />
            {isBackoffice && (
              <Button icon={<Icon name="plus" size={18} />} onClick={() => setCreating(true)}>
                Add prosumer
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-4">
        <TextField label="Search" placeholder="NIC, name or email" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
      </Card>

      <FilterPills<UserStatus>
        label="Filter by status"
        className="mb-6"
        value={status}
        onChange={setStatus}
        options={[
          { value: '', label: 'All', count: data?.length },
          { value: 'Pending', label: 'Pending activation', count: countFor('Pending') },
          { value: 'Active', label: 'Active', count: countFor('Active') },
          { value: 'Deactivated', label: 'Deactivated', count: countFor('Deactivated') },
        ]}
      />

      <ErrorAlert error={error} onRetry={reload} className="mb-6" />

      {!error && (
        <Card padded={false}>
          <DataTable
            caption="Prosumers"
            columns={columns}
            rows={rows}
            loading={loading}
            rowKey={(p) => p.nic}
            rowLabel={(p) => `Open ${p.fullName}, ${p.status}`}
            onRowClick={(p) => navigate(`/prosumers/${encodeURIComponent(p.nic)}`)}
            empty={
              <EmptyState
                title={status === 'Pending' ? 'No one is waiting for activation' : 'No prosumers match'}
                description={status === 'Pending' ? 'New registrations from the mobile app appear here.' : 'Try another search or status.'}
              />
            }
          />
        </Card>
      )}

      {creating && (
        <ProsumerFormDialog
          open
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            toast.success(`${saved.fullName} was added and emailed their sign-in details.`)
            setCreating(false)
            navigate(`/prosumers/${encodeURIComponent(saved.nic)}`)
          }}
        />
      )}
    </>
  )
}
