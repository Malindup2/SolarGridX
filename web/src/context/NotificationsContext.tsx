/*
 * NotificationsContext.tsx
 * The inbox behind the top-bar bell and the Notifications page. Polls every
 * 30 seconds while the tab is visible, and again whenever the window regains
 * focus. A failed poll keeps the last good inbox; the next one tries again.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { activityService } from '../services/activityService'
import type { NotificationInbox } from '../types/activity'

export const POLL_INTERVAL_MS = 30_000

interface NotificationsContextValue {
  inbox: NotificationInbox | null
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue>({
  inbox: null,
  refresh: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
})

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [inbox, setInbox] = useState<NotificationInbox | null>(null)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      setInbox(await activityService.inbox())
    } catch {
      // Keep showing the last inbox; the next poll retries.
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    // Polling the API is a subscription to an external system; the state update happens after the request.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh()

    const poll = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const timer = window.setInterval(poll, POLL_INTERVAL_MS)
    window.addEventListener('focus', poll)
    document.addEventListener('visibilitychange', poll)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', poll)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [refresh])

  const markRead = useCallback(async (id: string) => {
    // Optimistic: the badge drops at once; a failure is fixed by the next poll.
    setInbox((current) =>
      current
        ? {
            unreadCount: Math.max(0, current.unreadCount - (current.items.some((n) => n.id === id && !n.readAt) ? 1 : 0)),
            items: current.items.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
          }
        : current,
    )
    try {
      await activityService.markRead(id)
    } catch {
      void refresh()
    }
  }, [refresh])

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString()
    setInbox((current) => (current ? { unreadCount: 0, items: current.items.map((n) => (n.readAt ? n : { ...n, readAt: now })) } : current))
    try {
      await activityService.markAllRead()
    } catch {
      void refresh()
    }
  }, [refresh])

  return (
    <NotificationsContext.Provider value={{ inbox, refresh, markRead, markAllRead }}>{children}</NotificationsContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components -- the hook belongs with its provider
export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext)
}
