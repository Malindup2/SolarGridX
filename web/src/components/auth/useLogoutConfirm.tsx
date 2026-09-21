import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../ui/ConfirmDialog'

export function useLogoutConfirm() {
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const confirmLogout = async () => {
    setBusy(true)
    await logout()
    window.location.assign('/login?signedOut=1')
  }

  const dialog = (
    <ConfirmDialog
      open={open}
      title="Logout"
      message="Are you sure you want to logout?"
      confirmLabel={busy ? 'Logging out...' : 'Logout'}
      busy={busy}
      onConfirm={confirmLogout}
      onCancel={() => setOpen(false)}
    />
  )

  return { requestLogout: () => setOpen(true), dialog }
}
