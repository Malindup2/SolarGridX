/*
 * FormField.tsx
 * Labelled form controls (text, select, textarea) with hint and inline error,
 * wired to aria-describedby / aria-invalid so screen readers announce them.
 */

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

interface FieldShellProps {
  id: string
  label: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  children: ReactNode
  className?: string
}

const CONTROL_CLASSES = [
  'focus-ring w-full rounded-[14px] border bg-[var(--color-surface)] px-3.5 text-sm',
  'text-[var(--color-ink)] placeholder:text-[var(--color-muted)]/60',
  'disabled:bg-[var(--color-disabled)] disabled:cursor-not-allowed',
].join(' ')

function borderClass(error?: string | null) {
  return error ? 'border-[var(--color-status-rejected)]' : 'border-[var(--color-border)]'
}

function describedBy(id: string, hint?: ReactNode, error?: string | null) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

function FieldShell({ id, label, hint, error, required, children, className = '' }: FieldShellProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-ink)]">
        {label}
        {required && (
          <span className="ml-0.5 text-[var(--color-status-rejected)]" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-caption text-[var(--color-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-caption font-medium text-[var(--color-status-rejected)]">
          {error}
        </p>
      )}
    </div>
  )
}

interface CommonProps {
  label: string
  hint?: ReactNode
  error?: string | null
  containerClassName?: string
}

export function TextField({
  label,
  hint,
  error,
  containerClassName,
  id,
  required,
  className = '',
  ...rest
}: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={containerClassName}>
      <input
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={`${CONTROL_CLASSES} h-11 ${borderClass(error)} ${className}`}
        {...rest}
      />
    </FieldShell>
  )
}

export function SelectField({
  label,
  hint,
  error,
  containerClassName,
  id,
  required,
  className = '',
  children,
  ...rest
}: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={containerClassName}>
      <select
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={`${CONTROL_CLASSES} h-11 cursor-pointer ${borderClass(error)} ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  )
}

export function TextAreaField({
  label,
  hint,
  error,
  containerClassName,
  id,
  required,
  className = '',
  ...rest
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={containerClassName}>
      <textarea
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={`${CONTROL_CLASSES} min-h-24 py-2.5 ${borderClass(error)} ${className}`}
        {...rest}
      />
    </FieldShell>
  )
}
