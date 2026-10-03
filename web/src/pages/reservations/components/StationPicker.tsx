/*
 * StationPicker.tsx
 * Operators are not assigned to a station, so
 * every operator view picks one. Remembers the last choice per browser.
 */

import { useEffect } from 'react'
import { SelectField } from '../../../components/ui'
import { useApiQuery } from '../../../hooks/useApiQuery'
import { stationService } from '../../../services/stationService'
import { rememberStation } from './stationMemory'

interface StationPickerProps {
  value: string
  onChange: (stationId: string) => void
  label?: string
  /** Show an "All stations" option (list filters). */
  allowAll?: boolean
  remember?: boolean
  className?: string
}

export default function StationPicker({
  value,
  onChange,
  label = 'Station',
  allowAll = false,
  remember = false,
  className,
}: StationPickerProps) {
  const { data: stations, loading, error } = useApiQuery(() => stationService.getAll(), [])

  // Drop a remembered id that no longer exists (station deleted).
  useEffect(() => {
    if (!stations || !value) return
    if (!stations.some((station) => station.id === value)) {
      onChange('')
      if (remember) rememberStation('')
    }
  }, [stations, value, onChange, remember])

  const handleChange = (id: string) => {
    if (remember) rememberStation(id)
    onChange(id)
  }

  return (
    <SelectField
      label={label}
      value={value}
      disabled={loading}
      error={error ? 'Stations could not be loaded.' : null}
      onChange={(event) => handleChange(event.target.value)}
      containerClassName={className}
    >
      <option value="">{loading ? 'Loading stations…' : allowAll ? 'All stations' : 'Select a station'}</option>
      {stations?.map((station) => (
        <option key={station.id} value={station.id}>
          {station.stationName}
          {station.status !== 'Active' ? ' (inactive)' : ''}
        </option>
      ))}
    </SelectField>
  )
}
