/*
 * StationLocationPicker.tsx
 * Lets a backoffice user choose the station's exact GPS position on a map:
 * click the map, drag the pin, search an address or use the browser location.
 * Only rendered when a Maps key is configured; the form keeps lat/lng fields
 * either way, so the map is a convenience, never a requirement.
 */

import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui'
import { findStationPlaces, loadStationMap, mapId, type StationSearchResult } from '../../services/googleMaps'

export interface StationCoordinates {
  lat: number
  lng: number
}

interface StationLocationPickerProps {
  value: StationCoordinates | null
  onChange: (coordinates: StationCoordinates) => void
  address: string
  onAddressFound: (address: string) => void
}

const DEFAULT_CENTER: StationCoordinates = { lat: 6.9271, lng: 79.8612 }

export default function StationLocationPicker({ value, onChange, address, onAddressFound }: StationLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const latestValueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const [error, setError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<StationSearchResult[]>([])

  useEffect(() => {
    latestValueRef.current = value
  }, [value])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  function selectPosition(coordinates: StationCoordinates) {
    if (markerRef.current) markerRef.current.position = coordinates
    mapRef.current?.panTo(coordinates)
    onChangeRef.current(coordinates)
  }

  useEffect(() => {
    let cancelled = false
    let clickListener: google.maps.MapsEventListener | null = null

    async function initializeMap() {
      try {
        const { Map, AdvancedMarkerElement } = await loadStationMap()
        if (cancelled || !containerRef.current) return

        const initialPosition = latestValueRef.current
        const map = new Map(containerRef.current, {
          center: initialPosition ?? DEFAULT_CENTER,
          zoom: initialPosition ? 16 : 11,
          mapId: mapId(),
        })

        const marker = new AdvancedMarkerElement({
          map,
          position: initialPosition ?? undefined,
          gmpDraggable: true,
          title: 'Drag to the exact station location',
        })

        mapRef.current = map
        markerRef.current = marker

        clickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return
          selectPosition({ lat: event.latLng.lat(), lng: event.latLng.lng() })
        })

        marker.addEventListener('gmp-dragend', () => {
          const position = marker.position as google.maps.LatLngAltitudeLiteral | null
          if (!position) return
          onChangeRef.current({ lat: position.lat, lng: position.lng })
        })
      } catch {
        if (!cancelled) setError('The map could not load. Enter the latitude and longitude instead.')
      }
    }

    void initializeMap()

    return () => {
      cancelled = true
      clickListener?.remove()
      if (markerRef.current) markerRef.current.map = null
      markerRef.current = null
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!markerRef.current) return
    markerRef.current.position = value
    if (value) mapRef.current?.panTo(value)
  }, [value])

  async function findAddress() {
    if (address.trim().length < 3) {
      setError('Type at least three characters of the address first.')
      return
    }

    setSearching(true)
    setError(null)
    setSearchResults([])

    try {
      const results = await findStationPlaces(address.trim())
      setSearchResults(results)
      if (results.length === 0) setError('No matching place was found. Try a more specific address.')
    } catch {
      setError('Address search is unavailable. You can still click the map.')
    } finally {
      setSearching(false)
    }
  }

  function chooseSearchResult(result: StationSearchResult) {
    selectPosition({ lat: result.lat, lng: result.lng })
    mapRef.current?.setZoom(16)
    onAddressFound(result.address)
    setSearchResults([])
    setError(null)
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('This browser cannot share its location.')
      return
    }

    setError(null)
    // The browser asks for permission only when this button is pressed.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectPosition({ lat: position.coords.latitude, lng: position.coords.longitude })
        mapRef.current?.setZoom(16)
      },
      () => setError('Location unavailable or permission denied. Click the map instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--color-ink)]">Station position</span>
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" loading={searching} onClick={() => void findAddress()}>
            Find address on map
          </Button>
          <Button variant="ghost" size="sm" onClick={useCurrentLocation}>
            Use my location
          </Button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <ul className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1" aria-label="Matching places">
          {searchResults.map((result, index) => (
            <li key={`${result.address}-${index}`}>
              <button
                type="button"
                onClick={() => chooseSearchResult(result)}
                className="focus-ring block w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--color-background)]"
              >
                <span className="block font-semibold text-[var(--color-ink)]">{result.name}</span>
                <span className="block text-caption text-[var(--color-muted)]">{result.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        ref={containerRef}
        className="h-64 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)]"
        role="application"
        aria-label="Map for choosing the station position. Click to place the pin."
      />

      <p className="text-caption text-[var(--color-muted)]">Click the map or drag the pin to the exact station site.</p>
      {error && (
        <p role="alert" className="text-caption font-medium text-[var(--color-status-rejected)]">
          {error}
        </p>
      )}
    </div>
  )
}
