/*
 * Spinner.tsx
 * Small indeterminate loading indicator. Inherits the current text colour.
 */

interface SpinnerProps {
  size?: number
  label?: string
  className?: string
}

export default function Spinner({ size = 16, label, className = '' }: SpinnerProps) {
  return (
    <span role={label ? 'status' : undefined} className={`inline-flex items-center ${className}`}>
      <svg
        className="animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
