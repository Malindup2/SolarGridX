/*
 * UsersPage.tsx
 * Web accounts (Backoffice and Grid Operators): search, role / status filters,
 * create, edit and delete. Backoffice only. Prosumers live under /prosumers.
 * GET/POST /users, PUT/DELETE /users/{id}
 */

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Button,
  Card,
  ConfirmDialog,
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
import { tokenSubject } from '../../lib/jwt'
import { ROLE_LABELS } from '../../layouts/navConfig'
import { userService } from '../../services/userService'
import type { UserResponse } from '../../types/user'
import UserFormDialog from './UserFormDialog'
import { filterUsers, type RoleFilter, type StatusFilter } from './userRules'

export default function UsersPage() {
  const { auth } = useAuth()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<RoleFilter | ''>('')
  const [status, setStatus] = useState<StatusFilter | ''>('')
  const [editing, setEditing] = useState<UserResponse | null | 'new'>(null)
  const [deleting, setDeleting] = useState<UserResponse | null>(null)

  const { data, error, loading, reload } = useApiQuery((signal) => userService.list(signal), [])
  const remove = useApiMutation((id: string) => userService.remove(id))

  const rows = useMemo(() => (data ? filterUsers(data, query, role, status) : null), [data, query, role, status])
  const count = (predicate: (user: UserResponse) => boolean) => data?.filter(predicate).length

  const selfId = tokenSubject(auth?.token)
  const isSelf = (user: UserResponse) => user.id === selfId

  const columns: Column<UserResponse>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (user) => (
        <div>
          <p className="font-semibold">{user.fullName}</p>
          <p className="text-caption text-[var(--color-muted)]">{user.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (user) => ROLE_LABELS[user.role] },
    { key: 'status', header: 'Status', render: (user) => <StatusBadge status={user.status} /> },
    { key: 'created', header: 'Added', hideOnMobile: true, render: (user) => formatDateTime(user.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (user) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" icon={<Icon name="edit" size={16} />} onClick={() => setEditing(user)} aria-label={`Edit ${user.fullName}`}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Icon name="trash" size={16} />}
            disabled={isSelf(user)}
            onClick={() => {
              remove.reset()
              setDeleting(user)
            }}
            aria-label={`Delete ${user.fullName}`}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  const confirmDelete = async () => {
    if (!deleting) return
    // run() resolves to null when the call failed; the dialog then shows the error.
    if ((await remove.run(deleting.id)) === null) return
    toast.success(`${deleting.fullName} was deleted.`)
    setDeleting(null)
    reload()
  }

  const hasFilters = Boolean(query || role || status)

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Backoffice administrators and grid operators who sign in to the web application."
        actions={
          <>
            <ExportButton kind="users" filters={{ q: query, role, status }} />
            <Button icon={<Icon name="plus" size={18} />} onClick={() => setEditing('new')}>
              Add user
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <TextField
          label="Search"
          placeholder="Name, email or NIC"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
      </Card>

      <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <FilterPills<RoleFilter>
          label="Filter by role"
          value={role}
          onChange={setRole}
          options={[
            { value: '', label: 'All roles', count: data?.length },
            { value: 'Backoffice', label: 'Backoffice', count: count((u) => u.role === 'Backoffice') },
            { value: 'GridOperator', label: 'Grid operators', count: count((u) => u.role === 'GridOperator') },
          ]}
        />
        <FilterPills<StatusFilter>
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'Any status' },
            { value: 'Active', label: 'Active', count: count((u) => u.status === 'Active') },
            { value: 'Deactivated', label: 'Deactivated', count: count((u) => u.status === 'Deactivated') },
          ]}
        />
      </div>

      <ErrorAlert error={error} onRetry={reload} className="mb-6" />

      {!error && (
        <Card padded={false}>
          <DataTable
            caption="Web users"
            columns={columns}
            rows={rows}
            loading={loading}
            rowKey={(user) => user.id}
            empty={
              <EmptyState
                title={hasFilters ? 'No users match' : 'No web users yet'}
                description={hasFilters ? 'Try another search or filter.' : 'Add a grid operator so they can review bookings.'}
              />
            }
          />
        </Card>
      )}

      {editing && (
        <UserFormDialog
          open
          user={editing === 'new' ? null : editing}
          isSelf={editing !== 'new' && isSelf(editing)}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            toast.success(editing === 'new' ? `${saved.fullName} was added and emailed their sign-in details.` : 'Changes saved.')
            setEditing(null)
            reload()
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.fullName ?? 'this user'}?`}
        message="They will no longer be able to sign in. This cannot be undone."
        confirmLabel="Delete user"
        busy={remove.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <ErrorAlert error={remove.error} />
      </ConfirmDialog>
    </>
  )
}
