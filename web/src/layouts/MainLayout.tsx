import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import solargridlogo from '../assets/solargridlogo.png'

export default function MainLayout() {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = () => {
    logout()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false)
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`)
      setTimeout(() => {
        const elem = document.getElementById(sectionId)
        elem?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else {
      const elem = document.getElementById(sectionId)
      elem?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-ink)] scroll-smooth">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-8 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-3 text-inherit no-underline shrink-0">
            <img
              src={solargridlogo}
              alt="SolarGridX Logo"
              className="h-11 sm:h-12 w-auto object-contain"
            />
            <div>
              <span className="text-xl sm:text-2xl font-black tracking-tight flex items-center">
                <span className="text-[#49b02d]">SolarGrid</span>
                <span className="text-black ml-0.5">X</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link
              to="/"
              className={`text-button font-medium transition-colors hover:text-[var(--color-primary)] ${
                location.pathname === '/' && !location.hash
                  ? 'text-[var(--color-primary)] font-semibold'
                  : 'text-[var(--color-muted)]'
              }`}
            >
              <motion.span whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
                Home
              </motion.span>
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="text-button font-medium text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <motion.span whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
                How It Works
              </motion.span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('roles')}
              className="text-button font-medium text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <motion.span whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
                Microgrid Roles
              </motion.span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="text-button font-medium text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <motion.span whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
                About Us
              </motion.span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('contact')}
              className="text-button font-medium text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <motion.span whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
                Contact Us
              </motion.span>
            </button>
          </nav>

          {/* Right Navigation & Auth Actions */}
          <div className="flex items-center gap-3">
            {auth ? (
              <div className="flex items-center gap-3">
                <Link
                  to={auth.homeRoute || '/'}
                  className="hidden sm:flex flex-col text-right no-underline"
                >
                  <span className="text-caption font-bold text-[var(--color-ink)]">
                    {auth.displayName || auth.nic}
                  </span>
                  <span className="text-[11px] text-[var(--color-muted)] font-medium">
                    {auth.role}
                  </span>
                </Link>

                <div className="hidden sm:block">
                  <StatusBadge status="Active" />
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-caption font-semibold rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-gray-100 transition-colors text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer"
                >
                  Sign Out
                </motion.button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                {/* Login Button with Framer Motion micro-interaction */}
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/login"
                    className="px-3.5 py-2 text-button font-semibold rounded-[var(--radius-md)] text-[var(--color-ink)] hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login
                  </Link>
                </motion.div>

                {/* Sign Up Button with Framer Motion micro-interaction */}
                <motion.div
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Link
                    to="/register"
                    className="px-4 py-2 text-button font-bold rounded-[var(--radius-md)] text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Sign Up
                  </Link>
                </motion.div>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-[var(--radius-sm)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile Dropdown Menu with AnimatePresence */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden overflow-hidden border-t border-[var(--color-border)] mt-3 pt-3 pb-2 space-y-2 bg-[var(--color-surface)]"
            >
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--color-ink)] hover:bg-gray-50"
              >
                Home
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="w-full text-left block px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--color-muted)] hover:bg-gray-50 hover:text-[var(--color-primary)]"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('roles')}
                className="w-full text-left block px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--color-muted)] hover:bg-gray-50 hover:text-[var(--color-primary)]"
              >
                Microgrid Roles
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('about')}
                className="w-full text-left block px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--color-muted)] hover:bg-gray-50 hover:text-[var(--color-primary)]"
              >
                About Us
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="w-full text-left block px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--color-muted)] hover:bg-gray-50 hover:text-[var(--color-primary)]"
              >
                Contact Us
              </button>

              {!auth && (
                <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-[var(--radius-md)] text-button font-semibold text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-[var(--radius-md)] text-button font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-sm transition-all"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Sign Up
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main App Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-8 px-6 text-caption text-[var(--color-muted)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src={solargridlogo} alt="SolarGridX Logo" className="h-7 w-auto object-contain" />
              <span className="font-black text-base text-[var(--color-ink)]">
                <span className="text-[#49b02d]">SolarGrid</span>
                <span className="text-black ml-0.5">X</span>
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Decentralized Peer-to-Peer Solar Microgrid Trading and Regional Energy Operations platform for Sri Lanka.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">Navigation</h4>
            <ul className="space-y-1.5 text-xs">
              <li><button type="button" onClick={() => scrollToSection('how-it-works')} className="hover:text-[var(--color-primary)]">How It Works</button></li>
              <li><button type="button" onClick={() => scrollToSection('roles')} className="hover:text-[var(--color-primary)]">Microgrid Roles</button></li>
              <li><button type="button" onClick={() => scrollToSection('about')} className="hover:text-[var(--color-primary)]">About Us</button></li>
              <li><button type="button" onClick={() => scrollToSection('contact')} className="hover:text-[var(--color-primary)]">Contact Support</button></li>
            </ul>
          </div>

          {/* Column 3: Portals */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">Operations</h4>
            <ul className="space-y-1.5 text-xs">
              <li><Link to="/login" className="hover:text-[var(--color-primary)]">Backoffice Portal</Link></li>
              <li><Link to="/login" className="hover:text-[var(--color-primary)]">Grid Dispatch Terminal</Link></li>
              <li><span className="text-gray-400">Prosumer Mobile App</span></li>
            </ul>
          </div>

          {/* Column 4: Standards & Support */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">Grid Standard</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Compatible with Ceylon Electricity Board (CEB) & LECO 230V/400V 50Hz Distribution Microgrid Standards.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>© 2026 SolarGridX Smart Microgrid Initiative. All rights reserved.</span>
          <span>Sri Lanka National Clean Energy & Microgrid Governance</span>
        </div>
      </footer>
    </div>
  )
}
