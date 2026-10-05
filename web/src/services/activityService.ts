/*
 * activityService.ts
 * Notifications, audit trail, global search and CSV exports.
 */

import { isAxiosError } from 'axios'
import api from './api'
import { toParams } from '../lib/query'
import type { AuditEntry, AuditKind, ExportKind, NotificationInbox, NotificationPriority, SearchHit } from '../types/activity'

export const activityService = {
  async inbox(options: { unreadOnly?: boolean; priority?: NotificationPriority } = {}, signal?: AbortSignal): Promise<NotificationInbox> {
    const response = await api.get<NotificationInbox>('/notifications', { params: toParams(options), signal })
    return response.data
  },

  async markRead(id: string): Promise<void> {
    await api.post(`/notifications/${encodeURIComponent(id)}/read`)
  },

  async markAllRead(): Promise<void> {
    await api.post('/notifications/read-all')
  },

  async audit(kind: AuditKind, id: string, signal?: AbortSignal): Promise<AuditEntry[]> {
    const response = await api.get<AuditEntry[]>(`/audit/${kind}/${encodeURIComponent(id)}`, { signal })
    return response.data
  },

  async search(q: string, signal?: AbortSignal): Promise<SearchHit[]> {
    const response = await api.get<SearchHit[]>('/search', { params: { q }, signal })
    return response.data
  },

  /** Downloads a CSV and saves it under the filename the API suggests. */
  async exportCsv(kind: ExportKind, filters: object = {}): Promise<void> {
    let response
    try {
      response = await api.get<Blob>(`/exports/${kind}.csv`, { params: toParams(filters), responseType: 'blob' })
    } catch (error) {
      // With responseType 'blob' an error body arrives as a Blob; turn it back into the JSON envelope.
      if (isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
          error.response.data = JSON.parse(await error.response.data.text())
        } catch {
          // Not JSON; toApiError falls back to a generic message.
        }
      }
      throw error
    }

    const disposition = String(response.headers['content-disposition'] ?? '')
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
    const fileName = match ? decodeURIComponent(match[1]) : `solargridx-${kind}.csv`

    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  },
}
