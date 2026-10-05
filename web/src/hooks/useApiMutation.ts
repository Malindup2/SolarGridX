/*
 * useApiMutation.ts
 * Runs a write call (approve, reject, cancel...) and exposes loading and the
 * normalised API error. `run` resolves to the result, or null on failure.
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { toApiError, type ApiError } from '../services/api'

export interface ApiMutation<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | null>
  loading: boolean
  error: ApiError | null
  reset: () => void
}

export function useApiMutation<TArgs extends unknown[], TResult>(
  mutator: (...args: TArgs) => Promise<TResult>,
): ApiMutation<TArgs, TResult> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const inFlight = useRef(false)

  const mutatorRef = useRef(mutator)
  useLayoutEffect(() => {
    mutatorRef.current = mutator
  })

  const run = useCallback(async (...args: TArgs) => {
    // Guards against double submits from fast clicks.
    if (inFlight.current) return null
    inFlight.current = true
    setLoading(true)
    setError(null)
    try {
      return await mutatorRef.current(...args)
    } catch (err) {
      setError(toApiError(err))
      return null
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => setError(null), [])

  return { run, loading, error, reset }
}
