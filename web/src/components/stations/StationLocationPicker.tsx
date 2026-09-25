/*
 * StationLocationPicker.tsx
 * Lets a backoffice user choose the station's exact GPS position on a map.
 */

import { useEffect, useRef, useState } from 'react'
import {
  findStationPlaces,
  loadStationMap,
  type StationSearchResult,
} from '../../services/googleMaps'

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

export default function StationLocationPicker({
  value,
  onChange,
  address,
  onAddressFound,
}: StationLocationPickerProps) {
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
          mapId: import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID',
        })

        const marker = new AdvancedMarkerElement({
          map,
          position: initialPosition ?? undefined,
          gmpDraggable: true,
          title: 'Drag to the exact station location',
        })

        mapRef.current = map
        markerRef.current = marker

        // Clicking the map places or moves the station pin.
        clickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return
          selectPosition({
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          })
        })

        // Dragging the pin updates the coordinates shown in the form.
        marker.addEventListener('gmp-dragend', () => {
          const position = marker.position as google.maps.LatLngAltitudeLiteral | null
          if (!position) return

          onChangeRef.current({
            lat: position.lat,
            lng: position.lng,
          })
        })
      } catch {
        if (!cancelled) {
          setError('The map could not load. Check the Maps key and browser console.')
        }
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
        setError('Enter at least three characters in the address field.')
        return
      }

      setSearching(true)
      setError(null)
      setSearchResults([])

      try {
        const results = await findStationPlaces(address.trim())
        setSearchResults(results)

        if (results.length === 0) {
          setError('No matching place was found. Try a more specific address.')
        }
      } catch {
        setError('Address search is unavailable. You can still select the point on the map.')
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
      setError('This browser does not support current-location access.')
      return
    }

    setError(null)

    // Browser permission is requested only when the user presses this button.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        selectPosition(coordinates)
        mapRef.current?.setZoom(16)
      },
      () => setError('Location unavailable or permission denied. Select a point on the map.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-gray-700">
          Station position
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void findAddress()}
            disabled={searching}
            className="text-sm font-semibold text-green-700 hover:underline disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Find address on map'}
          </button>
          <button
            type="button"
            onClick={useCurrentLocation}
            className="text-sm font-semibold text-green-700 hover:underline"
          >
            Use my current location
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-2">
          <p className="px-2 pb-1 text-xs font-semibold text-gray-600">
            Choose the matching place:
          </p>
          {searchResults.map((result, index) => (
            <button
              key={`${result.address}-${index}`}
              type="button"
              onClick={() => chooseSearchResult(result)}
              className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-gray-100"
            >
              <span className="block font-semibold">{result.name}</span>
              <span className="block text-xs text-gray-500">{result.address}</span>
            </button>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="h-64 w-full rounded-xl border border-gray-200"
        aria-label="Map for selecting the station position"
      />

      <p className="text-xs text-gray-500">
        Click the map or drag the pin to the exact station site.
      </p>

      {value && (
        <p className="text-xs text-gray-700">
          GPS: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}