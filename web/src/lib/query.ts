/*
 * query.ts
 * Builds query strings for the API, dropping empty values so it never sees `?status=`.
 */

export function toParams(values: object): URLSearchParams {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim() !== '') params.set(key, value.trim())
    if (typeof value === 'number' && Number.isFinite(value)) params.set(key, String(value))
    if (typeof value === 'boolean') params.set(key, String(value))
  })
  return params
}
