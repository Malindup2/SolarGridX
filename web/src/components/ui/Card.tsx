/*
 * Card.tsx
 * Surface container with the shared border, radius and shadow tokens.
 */

import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  actions?: ReactNode
  padded?: boolean
  as?: 'section' | 'div' | 'article' | 'aside'
}

export default function Card({
  title,
  actions,
  padded = true,
  as: Tag = 'section',
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={`rounded-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-float)] ${className}`}
      {...rest}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          {title && <h2 className="text-h3 text-[var(--color-ink)]">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </Tag>
  )
}
