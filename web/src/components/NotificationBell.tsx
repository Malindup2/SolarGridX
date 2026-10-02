/*
 * NotificationBell.tsx
 * Top-bar bell with the unread count and a dropdown of the latest five.
 * "Open" marks the item read and goes to the record it is about.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationsContext'
import { formatDateTime } from '../lib/format'
import { badgeText, notificationRoute } from '../lib/notificationRoute'
import type { NotificationResponse } from '../types/activity'
import { Icon } from './ui'

const PRIORITY_DOT: Record<string, string> = {
  High: 'var(--color-status-rejected)',
  Medium: 'var(--color-status-pending)',
  Low: 'var(--color-status-completed)',
}

export default function NotificationBell() {
  const { inbox, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const unread = inbox?.unreadCount ?? 0
  const latest = inbox?.items.slice(0, 5) ?? []

  useEffect(() => {
    if (!open) return
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const openItem = (notification: NotificationResponse) => {
    setOpen(false)
    if (!notification.readAt) void markRead(notification.id)
    navigate(notificationRoute(notification))
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring relative rounded-full p-2 text-[var(--color-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-ink)]"
      >
        <Icon name="bell" size={22} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-[var(--color-status-rejected)] px-1.5 text-center text-[11px] font-bold leading-5 text-white">
            {badgeText(unread)}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-modal)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="focus-ring rounded text-caption font-semibold text-[var(--color-primary-hover)] hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {latest.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">You're all caught up.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-[var(--color-border)] overflow-y-auto">
              {latest.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={`focus-ring flex w-full gap-3 px-4 py-3 text-left hover:bg-[var(--color-background)] ${n.readAt ? '' : 'bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]'}`}
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_DOT[n.priority] }} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className={`block text-sm ${n.readAt ? 'text-[var(--color-muted)]' : 'font-semibold text-[var(--color-ink)]'}`}>{n.message}</span>
                      <span className="block text-caption text-[var(--color-muted)]">
                        {formatDateTime(n.createdAt)}
                        {!n.readAt && <span className="sr-only"> (unread)</span>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="focus-ring block border-t border-[var(--color-border)] px-4 py-3 text-center text-sm font-semibold text-[var(--color-primary-hover)] hover:bg-[var(--color-background)]"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
