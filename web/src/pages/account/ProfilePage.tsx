/*
 * ProfilePage.tsx
 * The signed-in staff member's own account: photo, contact details and their
 * account activity. GET/PUT /users/me, PUT/DELETE /users/me/avatar
 */

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import AuditHistory from '../../components/AuditHistory'
import Avatar from '../../components/Avatar'
import { Button, Card, ErrorAlert, PageHeader, Skeleton, StatusBadge, TextField } from '../../components/ui'
import { useProfile } from '../../context/ProfileContext'
import { useApiMutation } from '../../hooks/useApiMutation'
import { formatDateTime } from '../../lib/format'
import { ROLE_LABELS } from '../../layouts/navConfig'
import { AVATAR_TYPES, MAX_AVATAR_BYTES, profileService } from '../../services/profileService'
import type { ProfileResponse } from '../../types/user'
import { checkAvatarFile } from './profileRules'

interface Draft {
  fullName: string
  email: string
  phone: string
  address: string
}

const draftFor = (profile: ProfileResponse): Draft => ({
  fullName: profile.fullName,
  email: profile.email,
  phone: profile.phone ?? '',
  address: profile.address ?? '',
})

function ProfileForm({ profile, onSaved }: { profile: ProfileResponse; onSaved: (profile: ProfileResponse) => void }) {
  const [draft, setDraft] = useState<Draft>(() => draftFor(profile))
  const save = useApiMutation((value: Draft) => profileService.update(value))
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFor(profile))
  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const saved = await save.run(draft)
    if (saved) {
      toast.success('Profile saved.')
      onSaved(saved)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <TextField label="Full name" required value={draft.fullName} onChange={(e) => set('fullName', e.target.value)} containerClassName="sm:col-span-2" />
      <TextField label="Email" type="email" required value={draft.email} onChange={(e) => set('email', e.target.value)} hint="You sign in with this address." />
      <TextField label="Phone" value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
      <TextField label="Address" value={draft.address} onChange={(e) => set('address', e.target.value)} containerClassName="sm:col-span-2" />
      <ErrorAlert error={save.error} className="sm:col-span-2" />
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={save.loading} disabled={!dirty}>
          Save changes
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setDraft(draftFor(profile))}>
            Undo
          </Button>
        )}
      </div>
    </form>
  )
}

export default function ProfilePage() {
  const { profile, setProfile } = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = useApiMutation((file: File) => profileService.uploadAvatar(file))
  const remove = useApiMutation(() => profileService.removeAvatar())

  const pickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // picking the same file again still fires
    if (!file) return

    const problem = checkAvatarFile(file)
    if (problem) {
      toast.error(problem)
      return
    }

    const saved = await upload.run(file)
    if (saved) {
      setProfile(saved)
      toast.success('Photo updated.')
    }
  }

  const removePhoto = async () => {
    const saved = await remove.run()
    if (saved) {
      setProfile(saved)
      toast.success('Photo removed.')
    }
  }

  return (
    <>
      <PageHeader title="My profile" subtitle="Your contact details and photo, as other SolarGridX staff see them." />

      {!profile ? (
        <Card>
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar name={profile.fullName} version={profile.avatarVersion} size={80} />
                <div className="min-w-0 flex-1">
                  <p className="text-h3 text-[var(--color-ink)]">{profile.fullName}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {ROLE_LABELS[profile.role]} · member since {formatDateTime(profile.createdAt)}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={profile.status} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(',')} className="hidden" onChange={pickFile} aria-label="Choose a profile photo" />
                  <Button variant="secondary" size="sm" loading={upload.loading} onClick={() => fileRef.current?.click()}>
                    {profile.avatarVersion ? 'Change photo' : 'Add photo'}
                  </Button>
                  {profile.avatarVersion && (
                    <Button variant="ghost" size="sm" loading={remove.loading} onClick={removePhoto}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-3 text-caption text-[var(--color-muted)]">JPEG or PNG, up to {MAX_AVATAR_BYTES / 1024 / 1024} MB.</p>
              <ErrorAlert error={upload.error ?? remove.error} className="mt-3" />
            </Card>

            <Card title="Contact details">
              <ProfileForm key={profile.updatedAt} profile={profile} onSaved={setProfile} />
            </Card>

            <Card title="Password">
              <p className="mb-3 text-sm text-[var(--color-muted)]">Changing your password signs you out on every other device.</p>
              <Link to="/change-password" className="focus-ring inline-flex h-9 items-center rounded-full border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-background)]">
                Change password
              </Link>
            </Card>
          </div>

          <AuditHistory kind="users" id="me" title="My account activity" />
        </div>
      )}
    </>
  )
}
