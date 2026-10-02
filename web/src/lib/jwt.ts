/*
 * jwt.ts
 * Reads claims from the session token for display decisions only (e.g. hiding
 * "Delete" on your own account). The API re-checks everything; nothing here
 * is trusted for security.
 */

export function tokenSubject(token: string | null | undefined): string | null {
  const payload = token?.split('.')[1]
  if (!payload) return null

  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '='))
    const claims = JSON.parse(json) as { sub?: unknown }
    return typeof claims.sub === 'string' ? claims.sub : null
  } catch {
    return null
  }
}
