/*
 * googleMaps.ts
 * Loads only the Google Maps libraries needed by the station screens.
 * Maps are optional: without VITE_GOOGLE_MAPS_API_KEY every station screen
 * works with plain latitude / longitude fields and a list instead.
 */

import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

let configured = false

export function isMapsConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
}

export function mapId(): string {
  return import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID'
}

export async function loadStationMap() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!key) {
    throw new Error('The Google Maps API key is missing from web/.env.')
  }

  // Configure the loader once, even if several station maps are opened.
  if (!configured) {
    setOptions({ key, v: 'weekly' })
    configured = true
  }

  const [mapsLibrary, markerLibrary] = await Promise.all([importLibrary('maps'), importLibrary('marker')])

  return {
    Map: mapsLibrary.Map,
    AdvancedMarkerElement: markerLibrary.AdvancedMarkerElement,
  }
}

export interface StationSearchResult {
  name: string
  address: string
  lat: number
  lng: number
}

export async function findStationPlaces(query: string): Promise<StationSearchResult[]> {
  await loadStationMap()
  const { Place } = await importLibrary('places')

  const { places } = await Place.searchByText({
    textQuery: query,
    fields: ['displayName', 'formattedAddress', 'location'],
    maxResultCount: 5,
    region: 'lk',
    locationBias: { lat: 7.8731, lng: 80.7718 },
  })

  return places.flatMap((place) => {
    if (!place.location) return []

    return [
      {
        name: place.displayName ?? place.formattedAddress ?? query,
        address: place.formattedAddress ?? query,
        lat: place.location.lat(),
        lng: place.location.lng(),
      },
    ]
  })
}
