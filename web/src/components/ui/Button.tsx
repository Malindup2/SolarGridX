/*
 * Button.tsx
 * The one button for the app. Variants map to semantic tokens; `loading`
 * disables the button and announces the busy state.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Spinner from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
export type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] border border-transparent',
  secondary:
    'bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-background)]',
  ghost: 'bg-transparent text-[var(--color-ink)] border border-transparent hover:bg-[var(--color-background)]',
  danger:
    'bg-[var(--color-status-rejected)] text-white border border-transparent hover:brightness-90',
  // Quiet text action ("Back to reservations", "Cancel"), as in the reference success sheets
  subtle: 'bg-transparent text-[var(--color-muted)] border border-transparent hover:text-[var(--color-ink)]',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-button',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'focus-ring inline-flex items-center justify-center gap-2 rounded-full font-semibold',
        'transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </button>
  )
}
