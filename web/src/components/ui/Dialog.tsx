/*
 * Dialog.tsx
 * Accessible modal: traps focus, closes on Escape / backdrop (unless busy),
 * locks page scroll, and returns focus to the trigger when it closes.
 */

import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface DialogProps {
  open: boolean
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  busy?: boolean
  role?: 'dialog' | 'alertdialog'
  size?: 'sm' | 'md'
  onClose: () => void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Dialog({
  open,
  title,
  description,
  children,
  footer,
  busy = false,
  role = 'dialog',
  size = 'sm',
  onClose,
}: DialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  const onCloseRef = useRef(onClose)
  const busyRef = useRef(busy)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
    busyRef.current = busy
  })

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus the first control marked autoFocus, else the first focusable one.
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const preferred = panel.querySelector<HTMLElement>('[data-autofocus]')
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(preferred ?? first ?? panel).focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => {
              if (!busy) onClose()
            }}
          />
          <motion.div
            ref={panelRef}
            role={role}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={`relative w-full ${size === 'md' ? 'max-w-lg' : 'max-w-sm'} rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-modal)] outline-none`}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <h2 id={titleId} className="text-h3 text-[var(--color-ink)]">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {description}
              </div>
            )}
            {children && <div className="mt-4">{children}</div>}
            {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
