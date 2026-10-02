/*
 * NotificationsPage.tsx
 * The full inbox: filter by priority or unread, open an item (marks it read
 * and goes to the record), mark everything read. Same data as the bell.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, FilterPills, Icon, PageHeader, Skeleton } from '../../components/ui'
import { useNotifications } from '../../context/NotificationsContext'
import { formatDateTime } from '../../lib/format'
import { notificationRoute } from '../../lib/notificationRoute'
import type { NotificationPriority, NotificationResponse } from '../../types/activity'

type Filter = NotificationPriority | 'Unread'

const PRIORITY_COLOR: Record<NotificationPriority, string> = {
  High: 'var(--color-status-rejected)',
  Medium: 'var(--color-status-pending)',
  Low: 'var(--color-status-completed)',
}

export default function NotificationsPage() {
  const { inbox, refresh, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter | ''>('')
  const [refreshing, setRefreshing] = useState(false)

  const items = inbox?.items ?? []
  const shown = items.filter((n) => (filter === 'Unread' ? !n.readAt : filter ? n.priority === filter : true))
  const count = (predicate: (n: NotificationResponse) => boolean) => items.filter(predicate).length

  const open = (n: NotificationResponse) => {
    if (!n.readAt) void markRead(n.id)
    navigate(notificationRoute(n))
  }

  const reload = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Bookings, account changes and grid updates that involve you. Kept for 90 days."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Icon name="refresh" size={16} />} loading={refreshing} onClick={reload}>
              Refresh
            </Button>
            <Button size="sm" disabled={!inbox?.unreadCount} onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          </>
        }
      />

      <FilterPills<Filter>
        label="Filter notifications"
        className="mb-6"
        value={filter}
        onChange={setFilter}
        options={[
          { value: '', label: 'All', count: items.length },
          { value: 'Unread', label: 'Unread', count: inbox?.unreadCount },
          { value: 'High', label: 'High priority', count: count((n) => n.priority === 'High') },
          { value: 'Medium', label: 'Medium', count: count((n) => n.priority === 'Medium') },
          { value: 'Low', label: 'Low', count: count((n) => n.priority === 'Low') },
        ]}
      />

      <Card padded={false}>
        {!inbox ? (
          <div className="space-y-3 p-5" aria-busy="true">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState title={filter ? 'Nothing here' : "You're all caught up"} description="New notifications appear here as things happen." icon={<Icon name="bell" size={24} />} />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {shown.map((n) => (
              <li key={n.id} className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${n.readAt ? '' : 'bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]'}`}>
                <span className="hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block" style={{ backgroundColor: PRIORITY_COLOR[n.priority] }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.readAt ? 'text-[var(--color-muted)]' : 'font-semibold text-[var(--color-ink)]'}`}>{n.message}</p>
                  <p className="text-caption text-[var(--color-muted)]">
                    {n.category} · {n.priority} priority · {formatDateTime(n.createdAt)}
                    {!n.readAt && ' · Unread'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => open(n)}>
                    Open
                  </Button>
                  {!n.readAt && (
                    <Button size="sm" variant="ghost" onClick={() => void markRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
