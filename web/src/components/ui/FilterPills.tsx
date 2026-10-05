/*
 * FilterPills.tsx
 * A row of single-choice filter pills ("All · 12", "Pending · 3"), the same
 * look as the reservation status filter. Scrolls sideways on small screens.
 */

export interface PillOption<T extends string> {
  value: T | ''
  label: string
  count?: number
}

interface FilterPillsProps<T extends string> {
  label: string
  options: PillOption<T>[]
  value: T | ''
  onChange: (value: T | '') => void
  className?: string
}

export default function FilterPills<T extends string>({ label, options, value, onChange, className = '' }: FilterPillsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex gap-2 overflow-x-auto pb-1 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value || 'all'}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={[
              'focus-ring h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors',
              selected
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)]',
            ].join(' ')}
          >
            {option.label}
            {option.count !== undefined && ` · ${option.count}`}
          </button>
        )
      })}
    </div>
  )
}
