/*
 * ExportButton.tsx
 * Downloads the list on screen as CSV, with the same filters. The API caps an
 * export at 5,000 rows and says so (EXPORT_TOO_LARGE); that message is toasted.
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { toApiError } from '../../services/api'
import { activityService } from '../../services/activityService'
import type { ExportKind } from '../../types/activity'
import Button from './Button'
import Icon from './Icon'

interface ExportButtonProps {
  kind: ExportKind
  filters?: object
  label?: string
}

export default function ExportButton({ kind, filters = {}, label = 'Export CSV' }: ExportButtonProps) {
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (busy) return
    setBusy(true)
    try {
      await activityService.exportCsv(kind, filters)
    } catch (error) {
      toast.error(toApiError(error).message, { id: `export-${kind}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="secondary" size="sm" icon={<Icon name="download" size={16} />} loading={busy} onClick={run}>
      {label}
    </Button>
  )
}
