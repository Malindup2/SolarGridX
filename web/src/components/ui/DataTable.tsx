/*
 * DataTable.tsx
 * Generic table with skeleton loading rows and an empty slot. Below the `md`
 * breakpoint each row becomes a stacked card so nothing scrolls sideways.
 * Clickable rows are keyboard reachable (Enter / Space).
 */

import type { KeyboardEvent, ReactNode } from 'react'
import Skeleton from './Skeleton'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Hide on the stacked mobile card (e.g. secondary info). */
  hideOnMobile?: boolean
  align?: 'left' | 'right'
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | null
  rowKey: (row: T) => string
  loading?: boolean
  empty?: ReactNode
  caption?: string
  onRowClick?: (row: T) => void
  rowLabel?: (row: T) => string
}

const SKELETON_ROWS = 5

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  caption,
  onRowClick,
  rowLabel,
}: DataTableProps<T>) {
  const handleKey = (event: KeyboardEvent, row: T) => {
    // Keys pressed on a button inside the row belong to that button.
    if (!onRowClick || event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick(row)
    }
  }

  if (!loading && rows && rows.length === 0) {
    return <>{empty}</>
  }

  const interactive = Boolean(onRowClick)
  const rowProps = (row: T) =>
    interactive
      ? {
          tabIndex: 0,
          role: 'link' as const,
          'aria-label': rowLabel?.(row),
          onClick: () => onRowClick?.(row),
          onKeyDown: (event: KeyboardEvent) => handleKey(event, row),
        }
      : {}

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-sm" aria-busy={loading || undefined}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-caption font-semibold uppercase tracking-wide text-[var(--color-muted)] ${
                    column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b border-[var(--color-border)] last:border-0">
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3.5">
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows?.map((row) => (
                  <tr
                    key={rowKey(row)}
                    {...rowProps(row)}
                    className={`focus-ring border-b border-[var(--color-border)] last:border-0 ${
                      interactive ? 'cursor-pointer hover:bg-[var(--color-background)]' : ''
                    }`}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-3.5 text-[var(--color-ink)] ${column.align === 'right' ? 'text-right' : ''} ${
                          column.className ?? ''
                        }`}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <ul className="divide-y divide-[var(--color-border)] md:hidden" aria-busy={loading || undefined}>
        {loading
          ? Array.from({ length: 3 }, (_, index) => (
              <li key={`skeleton-${index}`} className="space-y-2 p-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </li>
            ))
          : rows?.map((row) => (
              <li
                key={rowKey(row)}
                {...rowProps(row)}
                className={`focus-ring p-4 ${interactive ? 'cursor-pointer active:bg-[var(--color-background)]' : ''}`}
              >
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  {columns
                    .filter((column) => !column.hideOnMobile)
                    .map((column) => (
                      <div key={column.key} className="contents">
                        <dt className="text-[var(--color-muted)]">{column.header}</dt>
                        <dd className="text-right text-[var(--color-ink)]">{column.render(row)}</dd>
                      </div>
                    ))}
                </dl>
              </li>
            ))}
      </ul>
    </>
  )
}
