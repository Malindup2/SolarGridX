/*
 * notificationRoute.ts
 * Where a notification's "Open" leads, from the action and resource id the API sends.
 */

import type { NotificationResponse, SearchHit } from '../types/activity'

export function notificationRoute(notification: Pick<NotificationResponse, 'action' | 'resourceId'>): string {
  const id = notification.resourceId ? encodeURIComponent(notification.resourceId) : null

  switch (notification.action) {
    case 'Reservation':
      return id ? `/reservations/${id}` : '/reservations'
    case 'Station':
      return id ? `/stations/${id}` : '/stations'
    case 'Prosumer':
      return id ? `/prosumers/${id}` : '/prosumers'
    case 'User':
      return '/users'
    default:
      return '/profile'
  }
}

/** Unread badge text: "99+" past 99. */
export function badgeText(count: number): string {
  return count > 99 ? '99+' : String(count)
}

/** Where a command-palette search result leads. */
export function routeForHit(hit: SearchHit): string {
  const id = encodeURIComponent(hit.id)
  switch (hit.kind) {
    case 'prosumer':
      return `/prosumers/${id}`
    case 'station':
      return `/stations/${id}`
    case 'reservation':
      return `/reservations/${id}`
    default:
      return '/users'
  }
}
