/*
 * AuditHistory.tsx
 * "What happened to this record": who did what and when, newest first.
 * GET /audit/{kind}/{id}. The API decides who may see which history.
 */

import { useState } from 'react'
import { Button, Card, EmptyState, ErrorAlert, Icon, Skeleton } from './ui'
import { useApiQuery } from '../hooks/useApiQuery'
import { formatDateTime } from '../lib/format'
import { activityService } from '../services/activityService'
import type { AuditKind } from '../types/activity'
import { eventLabel } from './auditFormat'

const ROLE_NAMES: Record<string, string> = {
  Backoffice: 'Backoffice',
  GridOperator: 'Grid operator',
  Prosumer: 'Prosumer',
}

interface AuditHistoryProps {
  kind: AuditKind
  id: string
  title?: string
  /** Show the first few entries until "Show all" is pressed. */
  initialCount?: number
}

export default function AuditHistory({ kind, id, title = 'Activity', initialCount = 5 }: AuditHistoryProps) {
  const [expanded, setExpanded] = useState(false)
  const { data, error, loading, reload } = useApiQuery((signal) => activityService.audit(kind, id, signal), [kind, id])

  const entries = data ?? []
  const visible = expanded ? entries : entries.slice(0, initialCount)

  return (
    <Card
      title={title}
      actions={
        <Button variant="ghost" size="sm" icon={<Icon name="refresh" size={16} />} onClick={reload} aria-label="Refresh activity">
          Refresh
        </Button>
      }
    >
      <ErrorAlert error={error} onRetry={reload} />

      {loading && !data && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}

      {data && entries.length === 0 && <EmptyState title="No activity yet" description="Changes to this record will show up here." />}

      {entries.length > 0 && (
        <ol className="space-y-3" aria-label={title}>
          {visible.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-ink)]">{eventLabel(entry.event)}</p>
                <p className="text-caption text-[var(--color-muted)]">
                  {entry.actorName}
                  {entry.actorRole ? ` · ${ROLE_NAMES[entry.actorRole] ?? entry.actorRole}` : ''} · {formatDateTime(entry.at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {entries.length > initialCount && (
        <Button variant="subtle" size="sm" className="mt-3" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Show less' : `Show all ${entries.length}`}
        </Button>
      )}
    </Card>
  )
}
