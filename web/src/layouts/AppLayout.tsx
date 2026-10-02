/*
 * AppLayout.tsx
 * Shell for signed-in Backoffice and Grid Operator users: role-aware sidebar
 * (drawer on small screens), top bar with the account menu, and the page
 * <Outlet/>. Pages render only their own content inside it.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import solargridlogo from '../assets/solargridlogo.png'
import { useAuth } from '../context/AuthContext'
import { useLogoutConfirm } from '../components/auth/useLogoutConfirm'
import Avatar from '../components/Avatar'
import CommandPalette from '../components/CommandPalette'
import NotificationBell from '../components/NotificationBell'
import { NotificationsProvider } from '../context/NotificationsContext'
import { ProfileProvider, useProfile } from '../context/ProfileContext'
import { navForRole, ROLE_LABELS, type NavSection } from './navConfig'

function Brand({ subtitle }: { subtitle: string }) {
  return (
    <Link to="/" className="focus-ring flex items-center gap-3 rounded-[var(--radius-md)]">
      <img src={solargridlogo} alt="" className="h-9 w-auto object-contain" />
      <span className="leading-tight">
        <span className="block text-lg font-black tracking-tight text-[var(--color-ink)]">
          <span className="text-[var(--color-primary)]">SolarGrid</span>X
        </span>
        <span className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
          {subtitle}
        </span>
      </span>
    </Link>
  )
}

function SidebarNav({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
            {section.title}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={!item.matchPrefix}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    [
                      'focus-ring flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary-hover)]'
                        : 'text-[var(--color-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-ink)]',
                    ].join(' ')
                  }
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function AccountMenu() {
  const { auth } = useAuth()
  const { profile } = useProfile()
  const { requestLogout, dialog } = useLogoutConfirm()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!auth) return null
  const roleLabel = ROLE_LABELS[auth.role]

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring flex items-center gap-2.5 rounded-[var(--radius-md)] p-1.5 pr-2 hover:bg-[var(--color-background)]"
      >
        <Avatar name={profile?.fullName ?? auth.displayName} version={profile?.avatarVersion} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-semibold text-[var(--color-ink)]">{profile?.fullName ?? auth.displayName}</span>
          <span className="block text-caption text-[var(--color-muted)]">{roleLabel}</span>
        </span>
        <svg className="h-4 w-4 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-modal)]"
        >
          <div className="border-b border-[var(--color-border)] px-3 py-2.5 md:hidden">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{auth.displayName}</p>
            <p className="text-caption text-[var(--color-muted)]">{roleLabel}</p>
          </div>
          <Link
            role="menuitem"
            to="/profile"
            onClick={() => setOpen(false)}
            className="focus-ring block rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-background)]"
          >
            My profile
          </Link>
          <Link
            role="menuitem"
            to="/notifications"
            onClick={() => setOpen(false)}
            className="focus-ring block rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-background)]"
          >
            Notifications
          </Link>
          <Link
            role="menuitem"
            to="/change-password"
            onClick={() => setOpen(false)}
            className="focus-ring block rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-background)]"
          >
            Change password
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false)
              requestLogout()
            }}
            className="focus-ring block w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-semibold text-[var(--color-status-rejected)] hover:bg-[var(--color-background)]"
          >
            Log out
          </button>
        </div>
      )}
      {dialog}
    </div>
  )
}

export default function AppLayout() {
  const { auth } = useAuth()
  const location = useLocation()
  // The drawer is tied to the path it was opened on, so any navigation closes it.
  const [drawerPath, setDrawerPath] = useState<string | null>(null)
  const drawerOpen = drawerPath === location.pathname
  const setDrawerOpen = (open: boolean) => setDrawerPath(open ? location.pathname : null)
  const sections = navForRole(auth?.role)
  const subtitle = auth?.role === 'GridOperator' ? 'Operator console' : 'Backoffice'

  useEffect(() => {
    if (!drawerOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerPath(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [drawerOpen])

  return (
    <ProfileProvider>
    <NotificationsProvider>
    <div className="min-h-screen bg-[var(--color-background)] font-sans text-[var(--color-ink)] antialiased">
      <a
        href="#main-content"
        className="focus-ring sr-only z-[200] rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-[var(--color-border)] px-5">
          <Brand subtitle={subtitle} />
        </div>
        <SidebarNav sections={sections} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={() => setDrawerOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col bg-[var(--color-surface)] shadow-[var(--shadow-modal)]">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5">
              <Brand subtitle={subtitle} />
              <button
                type="button"
                autoFocus
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="focus-ring rounded-[var(--radius-md)] p-2 text-[var(--color-muted)] hover:bg-[var(--color-background)]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <SidebarNav sections={sections} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              className="focus-ring rounded-[var(--radius-md)] p-2 text-[var(--color-muted)] hover:bg-[var(--color-background)] lg:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-[var(--color-muted)] lg:hidden">SolarGridX</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <CommandPalette />
            <NotificationBell />
            <AccountMenu />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 p-4 outline-none sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
    </NotificationsProvider>
    </ProfileProvider>
  )
}
