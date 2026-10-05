/*
 * StationPills.tsx
 * One-tap station switcher (replaces a dropdown on the operator dashboard).
 * Remembers the choice per browser and preselects it, else the first station.
 */

import { useEffect } from 'react'
import { Skeleton } from '../../../components/ui'
import { useApiQuery } from '../../../hooks/useApiQuery'
import { stationService } from '../../../services/stationService'
import { rememberStation } from './stationMemory'

interface StationPillsProps {
  value: string
  onChange: (stationId: string, stationName: string) => void
}

export default function StationPills({ value, onChange }: StationPillsProps) {
  const { data: stations, loading, error } = useApiQuery(() => stationService.getAll(), [])

  // Keep a valid selection: drop a deleted remembered station, default to the first one.
  useEffect(() => {
    if (!stations || stations.length === 0) return
    const current = stations.find((station) => station.id === value)
    const pick = current ?? stations[0]
    if (!current) {
      rememberStation(pick.id)
      onChange(pick.id, pick.stationName)
    }
  }, [stations, value, onChange])

  if (loading) {
    return (
      <div className="flex gap-2" aria-busy="true">
        <Skeleton className="h-10 w-40 rounded-full" />
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>
    )
  }
  if (error) return <p className="text-sm text-[var(--color-status-rejected)]">Stations could not be loaded.</p>

  return (
    <div role="radiogroup" aria-label="Station" className="flex gap-2 overflow-x-auto pb-1">
      {stations?.map((station) => {
        const selected = station.id === value
        return (
          <button
            key={station.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              rememberStation(station.id)
              onChange(station.id, station.stationName)
            }}
            className={[
              'focus-ring h-10 shrink-0 whitespace-nowrap rounded-full border px-5 text-sm font-semibold transition-colors',
              selected
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)]',
            ].join(' ')}
          >
            {station.stationName}
            {station.status !== 'Active' ? ' · inactive' : ''}
          </button>
        )
      })}
    </div>
  )
}
