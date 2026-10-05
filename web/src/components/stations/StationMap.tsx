/*
 * StationMap.tsx
 * Overview map with one pin per station (from stored latitude / longitude).
 * Renders nothing when no Maps key is configured; the list stays the main view.
 */

import { useEffect, useRef, useState } from 'react'
import { isMapsConfigured, loadStationMap, mapId } from '../../services/googleMaps'
import type { StationResponse } from '../../types/station'

interface StationMapProps {
  stations: StationResponse[]
  onSelect: (station: StationResponse) => void
}

export default function StationMap({ stations, onSelect }: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelect)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!isMapsConfigured() || stations.length === 0) return
    let cancelled = false
    const markers: google.maps.marker.AdvancedMarkerElement[] = []

    loadStationMap()
      .then(({ Map, AdvancedMarkerElement }) => {
        if (cancelled || !containerRef.current) return
        const map = new Map(containerRef.current, { center: { lat: 7.8731, lng: 80.7718 }, zoom: 7, mapId: mapId() })
        const bounds = new google.maps.LatLngBounds()

        stations.forEach((station) => {
          const position = { lat: station.latitude, lng: station.longitude }
          const marker = new AdvancedMarkerElement({ map, position, title: `${station.stationName} (${station.status})` })
          marker.addListener('click', () => onSelectRef.current(station))
          markers.push(marker)
          bounds.extend(position)
        })

        if (stations.length > 1) map.fitBounds(bounds, 48)
        else map.setCenter(bounds.getCenter())
      })
      .catch(() => {
        if (!cancelled) setError('The map could not load. The station list below has everything.')
      })

    return () => {
      cancelled = true
      markers.forEach((marker) => (marker.map = null))
    }
  }, [stations])

  if (!isMapsConfigured()) return null

  return (
    <div className="mb-6">
      <div
        ref={containerRef}
        className="h-80 w-full rounded-[var(--radius-xl)] bg-[var(--color-background)] shadow-[var(--shadow-float)]"
        role="region"
        aria-label="Map of microgrid stations. The same stations are listed below."
      />
      {error && <p className="mt-2 text-caption text-[var(--color-status-rejected)]">{error}</p>}
    </div>
  )
}
