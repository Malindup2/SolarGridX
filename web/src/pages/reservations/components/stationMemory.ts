/*
 * stationMemory.ts
 * Remembers the operator's last picked station on this browser. Storage can
 * be blocked, so every access is guarded and failure just means "no memory".
 */

const STORAGE_KEY = 'solargridx.selectedStationId'

export function readRememberedStation(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberStation(id: string): void {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: the picker still works, it just won't remember.
  }
}
