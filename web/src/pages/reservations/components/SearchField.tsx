/*
 * SearchField.tsx
 * Pill search input with a leading icon and a clear button (matches mobile).
 */

import { Icon } from '../../../components/ui'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
}

export default function SearchField({
  value,
  onChange,
  placeholder = 'Search',
  label = 'Search',
  className = '',
}: SearchFieldProps) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
        <Icon name="search" size={20} />
      </span>
      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring h-11 w-full rounded-full bg-[var(--color-surface)] pl-11 pr-10 text-sm text-[var(--color-ink)] shadow-[var(--shadow-float)] placeholder:text-[var(--color-muted)]"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="focus-ring absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-background)]"
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </div>
  )
}
