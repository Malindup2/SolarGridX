/*
 * useApiQuery.ts
 * Loads data from a service call with loading / error / reload state.
 * A newer request aborts the previous one, so stale responses never win.
 * While a reload is in flight the previous data stays visible.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DependencyList } from 'react'
import { isCanceled, toApiError, type ApiError } from '../services/api'

export interface ApiQueryState<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
  reload: () => void
}

interface ApiQueryOptions {
  /** Skip the request (e.g. until a station is picked). */
  enabled?: boolean
}

interface Settled<T> {
  key: string
  data: T | null
  error: ApiError | null
}

export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  { enabled = true }: ApiQueryOptions = {},
): ApiQueryState<T> {
  const [reloadCount, setReloadCount] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)

  // Deps are plain values (ids, filters), so a string key identifies a request.
  const requestKey = `${JSON.stringify(deps)}#${reloadCount}`

  // Keep the latest fetcher without making it a dependency (callers pass inline lambdas).
  const fetcherRef = useRef(fetcher)
  useLayoutEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSettled({ key: requestKey, data, error: null })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isCanceled(err)) return
        setSettled((previous) => ({ key: requestKey, data: previous?.data ?? null, error: toApiError(err) }))
      })

    return () => controller.abort()
  }, [requestKey, enabled])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  const current = settled?.key === requestKey
  return {
    data: enabled ? settled?.data ?? null : null,
    error: enabled && current ? settled.error : null,
    loading: enabled && !current,
    reload,
  }
}
