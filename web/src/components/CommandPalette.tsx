/*
 * CommandPalette.tsx
 * Ctrl/Cmd+K: jump to a page, or search users, prosumers, stations and
 * reservations (GET /search, 300 ms after typing stops). Arrow keys move,
 * Enter opens, Escape closes. What a role can find is decided by the API.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { navForRole } from '../layouts/navConfig'
import { routeForHit } from '../lib/notificationRoute'
import { activityService } from '../services/activityService'
import type { SearchHit } from '../types/activity'
import { Dialog, Icon } from './ui'

const DEBOUNCE_MS = 300

interface Entry {
  key: string
  label: string
  hint: string
  to: string
}

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  user: 'User',
  prosumer: 'Prosumer',
  station: 'Station',
  reservation: 'Reservation',
}

export default function CommandPalette() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  // Ctrl+K / Cmd+K from anywhere in the signed-in app.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      activityService
        .search(trimmed, controller.signal)
        .then((result) => {
          setHits(result)
          setActive(0)
        })
        .catch(() => {
          if (!controller.signal.aborted) setHits([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed])

  const pages = useMemo(
    () =>
      navForRole(auth?.role)
        .flatMap((section) => section.items)
        .map((item) => ({ key: `page:${item.to}`, label: item.label, hint: 'Page', to: item.to })),
    [auth?.role],
  )

  const entries: Entry[] = useMemo(() => {
    const q = trimmed.toLowerCase()
    const matchingPages = pages.filter((page) => !q || page.label.toLowerCase().includes(q))
    const results =
      trimmed.length >= 2
        ? hits.map((hit) => ({
            key: `${hit.kind}:${hit.id}`,
            label: hit.label,
            hint: [KIND_LABEL[hit.kind], hit.sublabel].filter(Boolean).join(' · '),
            to: routeForHit(hit),
          }))
        : []
    return [...results, ...matchingPages]
  }, [hits, pages, trimmed])

  const close = () => {
    setOpen(false)
    setQuery('')
    setHits([])
    setActive(0)
  }

  const go = (entry: Entry | undefined) => {
    if (!entry) return
    close()
    navigate(entry.to)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, entries.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(entries[active])
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring flex h-10 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] sm:w-64"
        aria-label="Search (Ctrl+K)"
      >
        <Icon name="search" size={18} />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="ml-auto hidden rounded border border-[var(--color-border)] px-1.5 text-[11px] sm:inline">Ctrl K</kbd>
      </button>

      <Dialog open={open} size="md" title="Search" onClose={close}>
        <div onKeyDown={onKeyDown}>
          <input
            ref={inputRef}
            data-autofocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={entries[active] ? `${listId}-${active}` : undefined}
            aria-label="Search pages, people, stations and reservations"
            placeholder="Type a name, NIC, station or page…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              if (event.target.value.trim().length < 2) setHits([])
            }}
            className="focus-ring h-11 w-full rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm text-[var(--color-ink)]"
          />
          <p className="mt-2 text-caption text-[var(--color-muted)]" aria-live="polite">
            {searching ? 'Searching…' : trimmed.length >= 2 && hits.length === 0 ? 'No records match; pages are listed below.' : ' '}
          </p>
          <ul id={listId} role="listbox" aria-label="Results" className="mt-1 max-h-80 overflow-y-auto">
            {entries.map((entry, index) => (
              <li
                key={entry.key}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(entry)}
                className={`cursor-pointer rounded-[var(--radius-sm)] px-3 py-2 ${index === active ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]' : ''}`}
              >
                <span className="block text-sm font-semibold text-[var(--color-ink)]">{entry.label}</span>
                <span className="block text-caption text-[var(--color-muted)]">{entry.hint}</span>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </>
  )
}
