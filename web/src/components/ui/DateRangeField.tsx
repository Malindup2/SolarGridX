/*
 * DateRangeField.tsx
 * From / To date pair (yyyy-MM-dd). Keeps `to` from going before `from` in
 * the picker; the API stays the authority on what range is valid.
 */

import { TextField } from './FormField'

export interface DateRange {
  from: string
  to: string
}

interface DateRangeFieldProps {
  value: DateRange
  onChange: (range: DateRange) => void
  fromLabel?: string
  toLabel?: string
}

export default function DateRangeField({
  value,
  onChange,
  fromLabel = 'From',
  toLabel = 'To',
}: DateRangeFieldProps) {
  return (
    <fieldset className="grid grid-cols-2 gap-3">
      <legend className="sr-only">Date range</legend>
      <TextField
        type="date"
        label={fromLabel}
        value={value.from}
        max={value.to || undefined}
        onChange={(event) => onChange({ ...value, from: event.target.value })}
      />
      <TextField
        type="date"
        label={toLabel}
        value={value.to}
        min={value.from || undefined}
        onChange={(event) => onChange({ ...value, to: event.target.value })}
      />
    </fieldset>
  )
}
