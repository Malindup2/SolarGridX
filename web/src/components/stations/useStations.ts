/*
 * useStations.ts
 * Loads stations from the API and exposes loading, error, and refresh state.
 */

import { useCallback, useEffect, useState } from 'react'
import { stationService } from '../../services/stationService'
import type { StationResponse } from '../../types/station'

export function useStations() {
  const [stations, setStations] = useState<StationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshNumber, setRefreshNumber] = useState(0)

  const refresh = useCallback(() => {
    setRefreshNumber((current) => current + 1)
  }, [])

  useEffect(() => {
    let currentRequest = true

    setLoading(true)
    setError(null)

    stationService
      .getAll()
      .then((data) => {
        if (currentRequest) setStations(data)
      })
      .catch(() => {
        if (currentRequest) {
          setStations([])
          setError('Could not load stations. Please try again.')
        }
      })
      .finally(() => {
        if (currentRequest) setLoading(false)
      })

    return () => {
      currentRequest = false
    }
  }, [refreshNumber])

  return { stations, loading, error, refresh }
}