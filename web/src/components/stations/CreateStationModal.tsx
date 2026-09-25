/*
 * CreateStationModal.tsx
 * Collects station details and registers a station through the existing API.
 */

import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { stationService } from '../../services/stationService'
import type { ApiErrorResponse } from '../../types/auth'
import type { StationType } from '../../types/station'
import StationLocationPicker, {
  type StationCoordinates,
} from './StationLocationPicker'

interface CreateStationModalProps {
  onClose: () => void
  onCreated: () => void
}

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export default function CreateStationModal({
  onClose,
  onCreated,
}: CreateStationModalProps) {
  const [stationName, setStationName] = useState('')
  const [location, setLocation] = useState('')
  const [coordinates, setCoordinates] = useState<StationCoordinates | null>(null)
  const [capacityKwh, setCapacityKwh] = useState('')
  const [batterySlotCount, setBatterySlotCount] = useState('')
  const [type, setType] = useState<StationType>('AC')
  const [openTime, setOpenTime] = useState('08:00')
  const [closeTime, setCloseTime] = useState('18:00')
  const [activeDays, setActiveDays] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  function toggleDay(day: string) {
    setActiveDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Match the important rules in CreateStationRequestValidator.cs.
    const nextErrors: string[] = []
    const capacity = Number(capacityKwh)
    const batteryPositions = Number(batterySlotCount)

    if (!stationName.trim() || stationName.trim().length > 120) {
      nextErrors.push('Station name is required and must be at most 120 characters.')
    }
    if (!location.trim() || location.trim().length > 250) {
      nextErrors.push('Location is required and must be at most 250 characters.')
    }
    if (!coordinates) {
      nextErrors.push('Select the station position on the map.')
    }
    if (!capacityKwh || !Number.isFinite(capacity) || capacity <= 0) {
      nextErrors.push('Capacity must be greater than 0 kWh.')
    }
    if (
      !batterySlotCount ||
      !Number.isInteger(batteryPositions) ||
      batteryPositions <= 0
    ) {
      nextErrors.push('Battery positions must be a positive whole number.')
    }
    if (openTime >= closeTime) {
      nextErrors.push('Closing time must be later than opening time.')
    }
    if (activeDays.length === 0) {
      nextErrors.push('Select at least one active day.')
    }

    setErrors(nextErrors)
    if (nextErrors.length > 0 || !coordinates) return

    setSubmitting(true)

    try {
      await stationService.create({
        stationName: stationName.trim(),
        location: location.trim(),
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        capacityKwh: capacity,
        batterySlotCount: batteryPositions,
        type,
        operationalSchedule: {
          openTime,
          closeTime,
          activeDays: WEEKDAYS.filter((day) => activeDays.includes(day)),
        },
      })

      onCreated()
    } catch (error: unknown) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const response = error.response?.data
        setErrors(
          response?.details?.length
            ? response.details
            : [response?.message || 'Could not create the station.'],
        )
      } else {
        setErrors(['Could not create the station. Please try again.'])
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-station-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="create-station-title" className="text-xl font-bold text-gray-900">
              Add Station
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter the station details and select its exact map position.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close Add Station form"
            className="text-xl text-gray-500 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">
              Station name
              <input
                value={stationName}
                onChange={(event) => setStationName(event.target.value)}
                maxLength={120}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              />
            </label>

            <label className="text-sm font-semibold text-gray-700">
              Station type
              <select
                value={type}
                onChange={(event) => setType(event.target.value as StationType)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              >
                <option value="AC">AC</option>
                <option value="DC">DC</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-semibold text-gray-700">
            Physical location / address
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={250}
              required
              placeholder="Example: Malabe, Sri Lanka"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
            />
          </label>

          <StationLocationPicker
            value={coordinates}
            onChange={setCoordinates}
            address={location}
            onAddressFound={setLocation}
            />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">
              Capacity (kWh)
              <input
                type="number"
                min="0.01"
                step="any"
                value={capacityKwh}
                onChange={(event) => setCapacityKwh(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              />
            </label>

            <label className="text-sm font-semibold text-gray-700">
              Battery positions
              <input
                type="number"
                min="1"
                step="1"
                value={batterySlotCount}
                onChange={(event) => setBatterySlotCount(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              />
            </label>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Operational schedule
            </h3>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-gray-700">
                Opens
                <input
                  type="time"
                  value={openTime}
                  onChange={(event) => setOpenTime(event.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700">
                Closes
                <input
                  type="time"
                  value={closeTime}
                  onChange={(event) => setCloseTime(event.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
            </div>

            <p className="mt-3 text-sm text-gray-700">Active days</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {WEEKDAYS.map((day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={activeDays.includes(day)}
                    onChange={() => toggleDay(day)}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>

          {errors.length > 0 && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {errors.map((error, index) => (
                <p key={`${index}-${error}`}>{error}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Add Station'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}