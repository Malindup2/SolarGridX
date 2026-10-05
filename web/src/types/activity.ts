export type NotificationPriority = 'High' | 'Medium' | 'Low'
export type NotificationAction = 'Reservation' | 'Station' | 'Prosumer' | 'User' | 'Profile'

export interface NotificationResponse {
  id: string
  category: 'Account' | 'Reservation' | 'Catalog' | 'Security'
  priority: NotificationPriority
  message: string
  action: NotificationAction
  resourceId: string | null
  createdAt: string
  readAt: string | null
}

export interface NotificationInbox {
  unreadCount: number
  items: NotificationResponse[]
}

export type AuditKind = 'users' | 'stations' | 'slots' | 'reservations'

export interface AuditEntry {
  id: string
  event: string
  actorName: string
  actorRole: string | null
  at: string
  correlationId: string | null
}

export interface SearchHit {
  kind: 'user' | 'prosumer' | 'station' | 'reservation'
  id: string
  label: string
  sublabel: string | null
}

export type ExportKind = 'users' | 'prosumers' | 'stations' | 'reservations'
