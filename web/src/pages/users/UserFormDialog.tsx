/*
 * UserFormDialog.tsx
 * Create or edit a web account (Backoffice / Grid Operator). Create sets a
 * temporary password that the API emails to the user; they must change it
 * on first sign-in. Edit sends the whole object (PUT needs role and status).
 */

import { useState, type FormEvent } from 'react'
import { Button, Dialog, ErrorAlert, SelectField, TextField } from '../../components/ui'
import { useApiMutation } from '../../hooks/useApiMutation'
import { userService } from '../../services/userService'
import type { StaffRole, UserResponse } from '../../types/user'
import { validateUserDraft, type UserDraft as Draft } from './userRules'

interface UserFormDialogProps {
  open: boolean
  /** Edit this user; omit to create a new one. */
  user?: UserResponse | null
  /** The signed-in admin can't change their own role or status (CANNOT_CHANGE_OWN_ACCESS). */
  isSelf?: boolean
  onClose: () => void
  onSaved: (user: UserResponse) => void
}

function draftFor(user?: UserResponse | null): Draft {
  return {
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    role: user?.role === 'Backoffice' ? 'Backoffice' : 'GridOperator',
    status: user?.status === 'Deactivated' ? 'Deactivated' : 'Active',
    password: '',
    nic: user?.nic ?? '',
    phone: user?.phone ?? '',
    address: user?.address ?? '',
  }
}

export default function UserFormDialog({ open, user, isSelf = false, onClose, onSaved }: UserFormDialogProps) {
  const creating = !user
  const [draft, setDraft] = useState<Draft>(() => draftFor(user))
  const [touched, setTouched] = useState(false)
  const save = useApiMutation((value: Draft) =>
    creating ? userService.createUser(value) : userService.update(user!.id, value),
  )

  const errors = touched ? validateUserDraft(draft, creating) : {}
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(validateUserDraft(draft, creating)).length > 0) return
    const saved = await save.run(draft)
    if (saved) onSaved(saved)
  }

  return (
    <Dialog
      open={open}
      size="md"
      title={creating ? 'Add a web user' : `Edit ${user!.fullName}`}
      description={
        creating
          ? 'They receive an email with these sign-in details and must choose a new password the first time they sign in.'
          : undefined
      }
      busy={save.loading}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={save.loading} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" loading={save.loading}>
            {creating ? 'Create user' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="user-form" noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" required value={draft.fullName} error={errors.fullName} onChange={(e) => set('fullName', e.target.value)} containerClassName="sm:col-span-2" autoComplete="off" />
        <TextField label="Email" type="email" required value={draft.email} error={errors.email} onChange={(e) => set('email', e.target.value)} autoComplete="off" />
        <SelectField
          label="Role"
          value={draft.role}
          disabled={isSelf}
          hint={isSelf ? 'You cannot change your own role.' : undefined}
          onChange={(e) => set('role', e.target.value as StaffRole)}
        >
          <option value="GridOperator">Grid operator</option>
          <option value="Backoffice">Backoffice administrator</option>
        </SelectField>
        {creating ? (
          <TextField
            label="Temporary password"
            type="text"
            required
            value={draft.password}
            error={errors.password}
            hint="At least 8 characters. Emailed to the user."
            onChange={(e) => set('password', e.target.value)}
            autoComplete="new-password"
          />
        ) : (
          <SelectField
            label="Status"
            value={draft.status}
            disabled={isSelf}
            hint={isSelf ? 'You cannot deactivate yourself.' : 'Deactivated users cannot sign in.'}
            onChange={(e) => set('status', e.target.value as Draft['status'])}
          >
            <option value="Active">Active</option>
            <option value="Deactivated">Deactivated</option>
          </SelectField>
        )}
        <TextField label="NIC (optional)" value={draft.nic} error={errors.nic} onChange={(e) => set('nic', e.target.value)} autoComplete="off" />
        <TextField label="Phone (optional)" value={draft.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="off" />
        <TextField label="Address (optional)" value={draft.address} onChange={(e) => set('address', e.target.value)} containerClassName="sm:col-span-2" autoComplete="off" />
        <ErrorAlert error={save.error} className="sm:col-span-2" />
      </form>
    </Dialog>
  )
}
