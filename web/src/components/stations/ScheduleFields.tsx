/*
 * ScheduleFields.tsx
 * Opening hours (UTC, as the API stores them) and the days a station operates.
 */

import { TextField } from '../ui'
import { hoursFor, WEEKDAYS, type ScheduleDraft } from './stationRules'

interface ScheduleFieldsProps {
  value: ScheduleDraft
  onChange: (value: ScheduleDraft) => void
  error?: string | null
}

export default function ScheduleFields({ value, onChange, error }: ScheduleFieldsProps) {
  const toggle = (day: string) =>
    onChange({
      ...value,
      activeDays: value.activeDays.includes(day)
        ? value.activeDays.filter((d) => d !== day)
        : WEEKDAYS.filter((d) => d === day || value.activeDays.includes(d)),
    })

  // A day gets its own hours when ticked; unticking drops the override and it follows the default again.
  const setCustom = (day: string, custom: boolean) =>
    onChange({
      ...value,
      dayHours: custom
        ? [...value.dayHours.filter((d) => d.day !== day), { day, ...hoursFor(value, day) }]
        : value.dayHours.filter((d) => d.day !== day),
    })

  const setDayTime = (day: string, key: 'openTime' | 'closeTime', time: string) =>
    onChange({ ...value, dayHours: value.dayHours.map((d) => (d.day === day ? { ...d, [key]: time } : d)) })

  // Switching a day off also drops its override, in a single update.
  const toggleDay = (day: string) => {
    if (value.activeDays.includes(day)) {
      onChange({ ...value, activeDays: value.activeDays.filter((d) => d !== day), dayHours: value.dayHours.filter((d) => d.day !== day) })
    } else {
      toggle(day)
    }
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-[var(--color-ink)]">Operating schedule (UTC)</legend>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Opens" type="time" value={value.openTime} onChange={(e) => onChange({ ...value, openTime: e.target.value })} />
        <TextField label="Closes" type="time" value={value.closeTime} onChange={(e) => onChange({ ...value, closeTime: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Operating days">
        {WEEKDAYS.map((day) => {
          const on = value.activeDays.includes(day)
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              onClick={() => toggleDay(day)}
              className={[
                'focus-ring h-9 rounded-full border px-3 text-sm font-semibold transition-colors',
                on
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)]',
              ].join(' ')}
            >
              {day.slice(0, 3)}
            </button>
          )
        })}
      </div>
      {value.activeDays.length > 0 && (
        <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
          <p className="text-caption font-semibold text-[var(--color-muted)]">Different hours on some days (optional)</p>
          {WEEKDAYS.filter((day) => value.activeDays.includes(day)).map((day) => {
            const own = value.dayHours.find((entry) => entry.day === day)
            return (
              <div key={day} className="flex flex-wrap items-center gap-3">
                <label className="flex w-28 items-center gap-2 text-sm text-[var(--color-ink)]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-primary)]"
                    checked={Boolean(own)}
                    onChange={(e) => setCustom(day, e.target.checked)}
                  />
                  {day}
                </label>
                {own ? (
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <TextField label={`${day} opens`} type="time" value={own.openTime} onChange={(e) => setDayTime(day, 'openTime', e.target.value)} />
                    <TextField label={`${day} closes`} type="time" value={own.closeTime} onChange={(e) => setDayTime(day, 'closeTime', e.target.value)} />
                  </div>
                ) : (
                  <span className="text-caption text-[var(--color-muted)]">
                    {value.openTime}–{value.closeTime} (default)
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="text-caption font-medium text-[var(--color-status-rejected)]">
          {error}
        </p>
      )}
    </fieldset>
  )
}
