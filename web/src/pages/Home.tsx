import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import herovideo from '../assets/herovideo.mp4'

const SUBHEADINGS = [
  'Decentralized Peer-to-Peer Solar Energy Trading',
  'Next-Gen Photovoltaic Distribution & Load Balancing',
  'Real-Time Microgrid Frequency Stabilization & Telemetry',
  'Automated Settlement for Clean Energy Producers',
  'Connecting Solar Prosumers Directly to Regional Grids',
]

export default function Home() {
  const { auth } = useAuth()
  const [subheadingIndex, setSubheadingIndex] = useState(0)

  // Contact form demo state
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactSent, setContactSent] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setSubheadingIndex((prev) => (prev + 1) % SUBHEADINGS.length)
    }, 3200)

    return () => clearInterval(interval)
  }, [])

  const handleContactSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setContactSent(true)
    toast.success('Inquiry submitted! Our microgrid dispatch team will contact you.')
    setTimeout(() => {
      setContactName('')
      setContactEmail('')
      setContactMessage('')
      setContactSent(false)
    }, 4000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-24">
      {/* 1. Hero Section with Cinematic Video & Dark Mid-Fade */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-neutral-800 shadow-2xl bg-black min-h-[500px] sm:min-h-[580px] flex items-center justify-center text-center p-6 sm:p-12 lg:p-16">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80"
          src={herovideo}
        />

        {/* Reduced Dark Mid-Fade Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/65 pointer-events-none" />
        <div className="absolute inset-0 bg-radial from-transparent via-black/15 to-black/55 pointer-events-none" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex items-center px-4 py-1.5 rounded-full bg-black/50 border border-white/20 text-xs font-semibold text-white backdrop-blur-md shadow-lg"
          >
            Sri Lanka Clean Energy Initiative • Smart Microgrid Ecosystem
          </motion.div>

          {/* Centered Title: SolarGrid (green) X (black) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
            className="flex items-center justify-center"
          >
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight drop-shadow-2xl flex items-center justify-center">
              <span className="text-[#49b02d]">SolarGrid</span>
              <span className="text-black bg-white px-2.5 sm:px-4 py-0 sm:py-1 rounded-2xl ml-1 shadow-2xl inline-block font-black transform -rotate-1 cursor-default">
                X
              </span>
            </h1>
          </motion.div>

          {/* Dynamic Changing Subheading with Framer Motion AnimatePresence */}
          <div className="h-14 sm:h-12 flex items-center justify-center px-4 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={subheadingIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="text-lg sm:text-2xl font-semibold text-gray-100 tracking-normal"
              >
                {SUBHEADINGS[subheadingIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-sm sm:text-base text-gray-300/95 max-w-2xl mx-auto leading-relaxed drop-shadow"
          >
            The SolarGridX Web Portal serves Backoffice Administrators and Regional Grid Operators to monitor microgrid dispatch, manage participant accounts, and balance regional clean energy distribution across Sri Lanka.
          </motion.p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {auth ? (
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Link
                  to={auth.homeRoute || '/'}
                  className="px-6 py-3.5 rounded-[var(--radius-md)] text-button font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2"
                >
                  Access Dashboard
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </motion.div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Link
                  to="/login"
                  className="px-7 py-3.5 rounded-[var(--radius-md)] text-button font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2"
                >
                  Sign In to Web Portal
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* 2. How It Works Section with Staggered Scroll-Reveals */}
      <section id="how-it-works" className="scroll-mt-24 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto space-y-3"
        >
          <span className="text-caption uppercase tracking-wider font-bold text-[var(--color-primary)]">
            Decentralized Energy Workflow
          </span>
          <h2 className="text-h1 sm:text-3xl font-extrabold text-[var(--color-ink)]">
            How SolarGridX Works
          </h2>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            From rooftop solar generation to regional distribution, explore the end-to-end telemetry and automated trading pipeline.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-7 shadow-[var(--shadow-card)] space-y-4 relative"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[var(--color-primary)] font-black text-xl flex items-center justify-center border border-emerald-200">
              01
            </div>
            <h3 className="text-h3 font-bold text-[var(--color-ink)]">Generate & Telemetry</h3>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Residential prosumers harvest solar power via rooftop PV panels. Smart bidirectional IoT meters record generation, household consumption, and calculate surplus energy available for regional export.
            </p>
            <div className="pt-2 text-caption font-semibold text-emerald-700 flex items-center gap-1">
              <span>Automated Meter Sync</span> • <span>IoT Inverter</span>
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.2 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-7 shadow-[var(--shadow-card)] space-y-4 relative"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[var(--color-accent)] font-black text-xl flex items-center justify-center border border-blue-200">
              02
            </div>
            <h3 className="text-h3 font-bold text-[var(--color-ink)]">Peer-to-Peer Trading</h3>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Surplus electricity is automatically listed on the microgrid exchange. Nearby consumers purchase clean power at fair local tariffs, bypassing expensive long-distance grid transmission overheads.
            </p>
            <div className="pt-2 text-caption font-semibold text-blue-700 flex items-center gap-1">
              <span>Automated Matching</span> • <span>Cryptographic Ledger</span>
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.3 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-7 shadow-[var(--shadow-card)] space-y-4 relative"
          >
            <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-800 font-black text-xl flex items-center justify-center border border-neutral-300">
              03
            </div>
            <h3 className="text-h3 font-bold text-[var(--color-ink)]">Grid Balance & Settlement</h3>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Regional Grid Operators monitor distribution feeders to preserve 50Hz frequency stability. Backoffice Administrators execute instant financial clearing and manage account compliance.
            </p>
            <div className="pt-2 text-caption font-semibold text-gray-700 flex items-center gap-1">
              <span>50Hz Frequency Hold</span> • <span>Daily Clearing</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Role Architecture Cards Section */}
      <section id="roles" className="scroll-mt-24 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto space-y-3"
        >
          <span className="text-caption uppercase tracking-wider font-bold text-[var(--color-accent)]">
            System Participants
          </span>
          <h2 className="text-h1 sm:text-3xl font-extrabold text-[var(--color-ink)]">
            Microgrid Personas & Access
          </h2>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            The SolarGridX ecosystem cleanly separates operational governance, substation dispatch, and mobile residential generation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Backoffice Admin */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-card)] flex flex-col justify-between hover:shadow-lg transition-shadow"
          >
            <div>
              <div className="w-12 h-12 rounded-[var(--radius-md)] bg-gray-100 text-gray-800 flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Web Portal Role
                </span>
              </div>
              <h3 className="text-h3 font-bold text-[var(--color-ink)] mb-2">Backoffice Admin</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-4">
                System administration, provisioning web accounts (Backoffice & Grid Operators), approving pending Prosumer registrations, and overseeing network governance.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-button font-semibold text-[var(--color-primary)] hover:underline"
            >
              Admin Sign In →
            </Link>
          </motion.div>

          {/* Grid Operator */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.2 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-card)] flex flex-col justify-between hover:shadow-lg transition-shadow"
          >
            <div>
              <div className="w-12 h-12 rounded-[var(--radius-md)] bg-blue-50 text-[var(--color-accent)] flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  Web Portal Role
                </span>
              </div>
              <h3 className="text-h3 font-bold text-[var(--color-ink)] mb-2">Grid Operator</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-4">
                Real-time feeder supervision, substation telemetry monitoring, regional load dispatching, and automated frequency stabilization.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-button font-semibold text-[var(--color-accent)] hover:underline"
            >
              Operator Sign In →
            </Link>
          </motion.div>

          {/* Solar Prosumer */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.3 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-card)] flex flex-col justify-between hover:shadow-lg transition-shadow"
          >
            <div>
              <div className="w-12 h-12 rounded-[var(--radius-md)] bg-emerald-50 text-[var(--color-primary)] flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Mobile App Role
                </span>
              </div>
              <h3 className="text-h3 font-bold text-[var(--color-ink)] mb-2">Solar Prosumer</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-4">
                Household solar generators register with their NIC and manage reservations, booking history and QR dispatch through the SolarGridX mobile app.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-button font-semibold text-[var(--color-muted)]">
              Available on the mobile app
            </span>
          </motion.div>
        </div>
      </section>

      {/* 4. About Us Section */}
      <section id="about" className="scroll-mt-24 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-[#1b2b18] via-[#142319] to-[#0d1c24] rounded-[var(--radius-lg)] p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary)] opacity-10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-5">
            <span className="text-caption uppercase tracking-wider font-bold text-emerald-400">
              About The Initiative
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Pioneering Sri Lanka's Decentralized Solar Energy Revolution
            </h2>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              SolarGridX was architected to empower Sri Lankan communities to achieve clean energy autonomy. Traditional centralized grids endure heavy transmission losses and power outages. By enabling peer-to-peer microgrids, households with rooftop solar become micro-powerplants that directly supply their local community.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4 border-t border-white/10">
              <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }}>
                <div className="text-2xl sm:text-3xl font-black text-[var(--color-primary)]">50Hz</div>
                <div className="text-xs text-gray-400 mt-0.5">National Grid Frequency Sync</div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }}>
                <div className="text-2xl sm:text-3xl font-black text-white">&lt; 3%</div>
                <div className="text-xs text-gray-400 mt-0.5">Microgrid Transmission Loss</div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }}>
                <div className="text-2xl sm:text-3xl font-black text-[var(--color-accent)]">100%</div>
                <div className="text-xs text-gray-400 mt-0.5">Automated Trade Clearing</div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 5. Contact Us Section */}
      <section id="contact" className="scroll-mt-24 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto space-y-3"
        >
          <span className="text-caption uppercase tracking-wider font-bold text-[var(--color-primary)]">
            Operations & Support
          </span>
          <h2 className="text-h1 sm:text-3xl font-extrabold text-[var(--color-ink)]">
            Contact Grid Support Desk
          </h2>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Need technical assistance, feeder node provisioning, or account access help? Reach our dedicated operations engineers.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Support Information Cards */}
          <div className="lg:col-span-5 space-y-4">
            <motion.div
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-card)] flex items-start gap-4"
            >
              <div className="p-2.5 rounded-lg bg-emerald-50 text-[var(--color-primary)] shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--color-ink)]">24/7 Grid Dispatch Emergency</h4>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">+94 (11) 234-GRID (4743)</p>
                <p className="text-[11px] text-gray-400 mt-1">For feeder faults & frequency anomalies.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-card)] flex items-start gap-4"
            >
              <div className="p-2.5 rounded-lg bg-blue-50 text-[var(--color-accent)] shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--color-ink)]">Technical Inquiries</h4>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">support@solargridx.lk</p>
                <p className="text-[11px] text-gray-400 mt-1">Response within 2 hours during operational shifts.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-card)] flex items-start gap-4"
            >
              <div className="p-2.5 rounded-lg bg-gray-100 text-gray-700 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--color-ink)]">Operations Headquarters</h4>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">Level 7, Clean Energy Tower, Galle Road, Colombo 03</p>
                <p className="text-[11px] text-gray-400 mt-1">Western Province Microgrid Operations Centre</p>
              </div>
            </motion.div>
          </div>

          {/* Quick Inquiry Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:col-span-7 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-7 shadow-[var(--shadow-card)]"
          >
            <h3 className="text-h3 font-bold text-[var(--color-ink)] mb-1">Submit Operations Inquiry</h3>
            <p className="text-xs text-[var(--color-muted)] mb-5">
              Submit a service ticket or inquiry to the Microgrid Backoffice Administration desk.
            </p>

            {contactSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-[var(--radius-md)] bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm"
              >
                <p className="font-semibold text-emerald-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Inquiry Received!
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  Thank you! Your inquiry has been routed to our microgrid dispatch team.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption font-semibold text-[var(--color-ink)] mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Kasun Fernando"
                      className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-caption font-semibold text-[var(--color-ink)] mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="kasun@example.com"
                      className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-caption font-semibold text-[var(--color-ink)] mb-1">
                    Inquiry Details
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Describe your microgrid node, account verification issue, or operational inquiry..."
                    className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="py-2.5 px-5 rounded-[var(--radius-md)] text-button font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  Send Inquiry
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </motion.button>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  )
}
