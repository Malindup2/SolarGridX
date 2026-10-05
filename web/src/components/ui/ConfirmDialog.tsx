/*
 * ConfirmDialog.tsx
 * Yes/no confirmation built on Dialog. `tone="danger"` for destructive actions
 * (logout, cancel, reject); `tone="primary"` for positive ones (approve).
 */

import type { ReactNode } from 'react'
import Button from './Button'
import Dialog from './Dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  tone?: 'danger' | 'primary'
  children?: ReactNode
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  tone = 'danger',
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      title={title}
      description={message}
      busy={busy}
      role="alertdialog"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onCancel} data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant={tone} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}
