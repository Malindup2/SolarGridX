/*
 * Skeleton.tsx
 * Placeholder block shown while content loads, to avoid layout shift.
 */

interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-border)] ${className}`}
    />
  )
}
