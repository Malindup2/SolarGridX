/*
 * ProsumerFormDialog.tsx
 * Backoffice creates a prosumer (created Active, temporary password emailed)
 * or edits one. NIC is the primary key (BR-06), so it can't change once set.
 */

import { useState, type FormEvent } from 'react'
import { Button, Dialog, ErrorAlert, TextField } from '../../components/ui'
import { useApiMutation } from '../../hooks/useApiMutation'
import { prosumerService } from '../../services/prosumerService'
import type { ProsumerResponse } from '../../types/prosumer'
import { validateProsumerDraft, type ProsumerDraft as Draft } from './prosumerRules'

interface ProsumerFormDialogProps {
  open: boolean
  prosumer?: ProsumerResponse | null
  onClose: () => void
  onSaved: (prosumer: ProsumerResponse) => void
}

export default function ProsumerFormDialog({ open, prosumer, onClose, onSaved }: ProsumerFormDialogProps) {
  const creating = !prosumer
  const [draft, setDraft] = useState<Draft>({
    nic: prosumer?.nic ?? '',
    fullName: prosumer?.fullName ?? '',
    email: prosumer?.email ?? '',
    password: '',
    phone: prosumer?.phone ?? '',
    address: prosumer?.address ?? '',
  })
  const [touched, setTouched] = useState(false)
  const save = useApiMutation((value: Draft) =>
    creating ? prosumerService.create(value) : prosumerService.update(prosumer!.nic, value),
  )

  const errors = touched ? validateProsumerDraft(draft, creating) : {}
  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(validateProsumerDraft(draft, creating)).length > 0) return
    const saved = await save.run(draft)
    if (saved) onSaved(saved)
  }

  return (
    <Dialog
      open={open}
      size="md"
      title={creating ? 'Add a prosumer' : `Edit ${prosumer!.fullName}`}
      description={
        creating
          ? 'The account is active straight away. The prosumer is emailed a temporary password for the mobile app.'
          : 'The NIC identifies the prosumer and cannot be changed.'
      }
      busy={save.loading}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={save.loading} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="prosumer-form" loading={save.loading}>
            {creating ? 'Create prosumer' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="prosumer-form" noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="NIC"
          required
          disabled={!creating}
          value={draft.nic}
          error={errors.nic}
          onChange={(e) => set('nic', e.target.value)}
          autoComplete="off"
        />
        <TextField label="Full name" required value={draft.fullName} error={errors.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="off" />
        <TextField label="Email" type="email" required value={draft.email} error={errors.email} onChange={(e) => set('email', e.target.value)} autoComplete="off" />
        {creating && (
          <TextField
            label="Temporary password"
            required
            value={draft.password}
            error={errors.password}
            hint="At least 8 characters. Emailed to the prosumer."
            onChange={(e) => set('password', e.target.value)}
            autoComplete="new-password"
          />
        )}
        <TextField label="Phone (optional)" value={draft.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="off" />
        <TextField label="Address (optional)" value={draft.address} onChange={(e) => set('address', e.target.value)} containerClassName="sm:col-span-2" autoComplete="off" />
        <ErrorAlert error={save.error} className="sm:col-span-2" />
      </form>
    </Dialog>
  )
}
