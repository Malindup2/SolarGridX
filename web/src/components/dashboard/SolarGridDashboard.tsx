import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import solargridlogo from '../../assets/solargridlogo.png'
import {
  ADMIN_CONFIG,
  OPERATOR_CONFIG,
  INITIAL_RESERVATION_STATS,
  INITIAL_STATIONS,
  INITIAL_PROSUMERS,
  INITIAL_ACTIVITY,
  type DashboardRole,
  type RoleDashboardConfig,
  type ProsumerRequest,
  type StationItem,
  type RecentActivityItem,
} from './dashboardConfig'
import KpiCard from './KpiCard'
import ReservationChart from './ReservationChart'
import ProsumerDetailModal from './ProsumerDetailModal'
import QuickActionModal, { type QuickActionType } from './QuickActionModal'

export interface SolarGridDashboardProps {
  initialRole?: DashboardRole
  userDisplayName?: string
  userNic?: string
  onLogout?: () => void
}

export default function SolarGridDashboard({
  initialRole = 'Backoffice',
  userDisplayName,
  userNic,
  onLogout,
}: SolarGridDashboardProps) {
  const navigate = useNavigate()

  // Active role is strictly determined by role prop/route (Admin vs Operator)
  const activeRole: DashboardRole = initialRole
  const config: RoleDashboardConfig = activeRole === 'Backoffice' ? ADMIN_CONFIG : OPERATOR_CONFIG

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Live ticking clock state
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Format live time string (e.g., 12:45:10 PM)
  const timeString = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  // Format date string (e.g., Mon, Sep 21, 2026)
  const dateString = currentTime.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Data states (with interactive updates)
  const [prosumers, setProsumers] = useState<ProsumerRequest[]>(INITIAL_PROSUMERS)
  const [stations, setStations] = useState<StationItem[]>(INITIAL_STATIONS)
  const [activity, setActivity] = useState<RecentActivityItem[]>(INITIAL_ACTIVITY)
  const [stats] = useState(INITIAL_RESERVATION_STATS)
  const [lastUpdated, setLastUpdated] = useState('Just now')

  // Modals state
  const [selectedProsumer, setSelectedProsumer] = useState<ProsumerRequest | null>(null)
  const [isProsumerModalOpen, setIsProsumerModalOpen] = useState(false)
  const [currentQuickAction, setCurrentQuickAction] = useState<QuickActionType | null>(null)
  const [isQuickActionModalOpen, setIsQuickActionModalOpen] = useState(false)

  // Notifications dropdown state
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // User management sub-view state
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('All')

  // Prosumer list filter
  const [prosumerStatusFilter, setProsumerStatusFilter] = useState<'All' | 'Pending' | 'Active' | 'Deactivated'>('Pending')

  // Refresh handler
  const handleRefresh = () => {
    setLastUpdated('Just now')
    toast.success('Microgrid telemetry refreshed')
  }

  // Handle Logout
  const handleSignOut = () => {
    if (onLogout) {
      onLogout()
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('displayName')
      localStorage.removeItem('homeRoute')
      toast.success('Logged out successfully')
      navigate('/login')
    }
  }

  // Activate Prosumer handler
  const handleActivateProsumer = (target: ProsumerRequest) => {
    setProsumers((prev) =>
      prev.map((p) => (p.id === target.id ? { ...p, status: 'Active' } : p))
    )
    setActivity((prev) => [
      {
        id: `act-${Date.now()}`,
        title: `Prosumer ${target.name} was activated`,
        description: `NIC: ${target.nic} - Authorized for Rooftop Solar PV injection`,
        timeAgo: 'Just now',
        type: 'activation',
      },
      ...prev,
    ])
    setIsProsumerModalOpen(false)
    toast.success(`Prosumer ${target.name} activated successfully!`)
  }

  // Deactivate Prosumer handler
  const handleDeactivateProsumer = (target: ProsumerRequest) => {
    setProsumers((prev) =>
      prev.map((p) => (p.id === target.id ? { ...p, status: 'Deactivated' } : p))
    )
    setActivity((prev) => [
      {
        id: `act-${Date.now()}`,
        title: `Prosumer ${target.name} was deactivated`,
        description: `NIC: ${target.nic} - Export privileges suspended`,
        timeAgo: 'Just now',
        type: 'deactivation',
      },
      ...prev,
    ])
    setIsProsumerModalOpen(false)
    toast.error(`Prosumer ${target.name} has been deactivated.`)
  }

  // Quick Action Click
  const handleQuickActionClick = (actionType: string) => {
    if (actionType === 'reviewProsumers') {
      setActiveTab('prosumers')
      setProsumerStatusFilter('Pending')
    } else {
      setCurrentQuickAction(actionType as QuickActionType)
      setIsQuickActionModalOpen(true)
    }
  }

  // Toggle station status
  const handleToggleStationStatus = (stationId: string) => {
    setStations((prev) =>
      prev.map((st) => {
        if (st.id === stationId) {
          const nextStatus = st.status === 'Active' ? 'Inactive' : 'Active'
          toast.success(`${st.name} is now ${nextStatus}`)
          return { ...st, status: nextStatus }
        }
        return st
      })
    )
  }

  // Derived counts
  const pendingProsumers = prosumers.filter((p) => p.status === 'Pending')
  const activeStations = stations.filter((s) => s.status === 'Active')
  const inactiveStations = stations.filter((s) => s.status === 'Inactive')

  // Users list state for Users tab
  const [usersList, setUsersList] = useState([
    { name: 'Admin', role: 'Backoffice', email: 'admin@solargridx.com', status: 'Active' },
    { name: 'Kamal Gunaratne', role: 'Grid Operator', email: 'operator@solargridx.com', status: 'Active' },
    { name: 'Sunil Wickramasinghe', role: 'Grid Operator', email: 'sunil.w@solargridx.lk', status: 'Active' },
    { name: 'Amal Perera', role: 'Prosumer', email: 'amal.perera@example.com', status: 'Pending' },
    { name: 'Kasun Silva', role: 'Prosumer', email: 'kasun.silva@example.com', status: 'Pending' },
    { name: 'Nimal Perera', role: 'Prosumer', email: 'nimal.perera@example.com', status: 'Pending' },
    { name: 'Dilani Samarawickrama', role: 'Prosumer', email: 'dilani.s@example.com', status: 'Active' },
    { name: 'Saman Kumara', role: 'Prosumer', email: 'saman.k@example.com', status: 'Active' },
  ])

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    const matchesRole = userRoleFilter === 'All' || u.role === userRoleFilter
    return matchesSearch && matchesRole
  })

  const renderQuickActionIcon = (icon: string) => {
    switch (icon) {
      case 'user-plus':
        return (
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        )
      case 'zap':
        return (
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      case 'user-check':
        return (
          <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'clock':
        return (
          <svg className="w-4 h-4 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'qr-code':
        return (
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        )
      case 'list':
        return (
          <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        )
      case 'alert-triangle':
        return (
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-gray-900 font-sans antialiased">
      {/* ─────────────────────────────────────────────────────────────
          1. LEFT SIDEBAR
      ───────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top brand header: Logo + Name with generous spacing */}
        <div className="flex-1 flex flex-col">
          <div className="h-20 px-6 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={solargridlogo}
                alt="SolarGrid Logo"
                className="h-9 w-auto object-contain"
              />
              <div>
                <div className="flex items-center">
                  <span className="text-xl font-black tracking-tight text-[#49b02d]">
                    SolarGrid
                  </span>
                  <span className="text-xl font-black text-black ml-0.5">X</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block -mt-0.5">
                  {activeRole === 'Backoffice' ? 'Admin Hub' : 'Dispatch Hub'}
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Section with spacious padding */}
          <nav className="py-6 px-4 space-y-2 flex-1 overflow-y-auto">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Main Navigation
            </div>

            {config.navItems.map((item) => {
              const isActive = activeTab === item.id

              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id)
                      setMobileSidebarOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold shadow-xs'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon */}
                      <span className="shrink-0">
                        {item.icon === 'home' && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        )}
                        {item.icon === 'users' && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                        {item.icon === 'zap' && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {item.icon === 'clock' && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {item.icon === 'clipboard-list' && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        )}
                        {item.icon === 'settings' && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        {item.icon === 'activity' && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        )}
                      </span>
                      <span className="truncate text-left">{item.label}</span>
                    </div>

                    {/* Badge */}
                    {item.badge !== undefined && (
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ml-2 ${
                          item.badgeColor === 'amber'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : item.badgeColor === 'primary'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>

                  {/* Sub-items (for Users in Admin mode) */}
                  {item.subItems && isActive && (
                    <div className="ml-8 pl-3 border-l-2 border-emerald-200 mt-2 space-y-1.5">
                      {item.subItems.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            if (sub.id === 'prosumer-requests') {
                              setActiveTab('prosumers')
                            } else if (sub.id === 'operators') {
                              setActiveTab('users')
                              setUserRoleFilter('Grid Operator')
                            } else {
                              setActiveTab('users')
                              setUserRoleFilter('All')
                            }
                            setMobileSidebarOpen(false)
                          }}
                          className="w-full text-left py-1.5 px-2 text-xs font-medium text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{sub.label}</span>
                          {sub.badge && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 shrink-0 ml-2">
                              {sub.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. TOP BAR & MAIN CONTENT AREA
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shadow-xs">
          {/* Left: Mobile hamburger & breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 hidden sm:inline">
                {activeRole === 'Backoffice' ? 'Backoffice Control Center' : 'Grid Dispatch Terminal'}
              </span>
            </div>
          </div>

          {/* Right Section: Exact layout requested
              1. Live Time
              2. Notification Bell
              3. Profile photo + Welcome [Name] + [Role] under that
              4. RED Logout button
          */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* 1. Live Time */}
            <div className="hidden sm:flex flex-col text-right pr-1 border-r border-gray-200">
              <div className="flex items-center justify-end gap-1.5 text-xs font-mono font-bold text-gray-900">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {timeString}
              </div>
              <span className="text-[10px] text-gray-400 font-medium">
                {dateString}
              </span>
            </div>

            {/* 2. Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* Red badge */}
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>

              {/* Notification dropdown */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-50 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <span className="font-bold text-gray-900">System Alerts</span>
                      <span className="text-[10px] text-gray-400">3 unread</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                        <span className="font-bold text-amber-900 block">12 Prosumers Pending</span>
                        <span className="text-amber-800 text-[11px]">Rooftop PV verifications require review.</span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                        <span className="font-bold text-emerald-900 block">Node 002 Synced</span>
                        <span className="text-emerald-800 text-[11px]">Kaduwela DC fast feeder restored.</span>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="font-bold text-gray-900 block">CEB Peak Window</span>
                        <span className="text-gray-700 text-[11px]">Grid export incentive tariff starts in 1h.</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. Profile Section: Photo + "Welcome, [Name]" + [Role] under that */}
            <div className="flex items-center gap-2.5 pl-1">
              {/* Profile Photo / Avatar with online dot */}
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center shadow-xs text-sm">
                  {(userDisplayName || config.roleDisplayName).charAt(0)}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              {/* Text stack: "Welcome, [Name]" & role underneath */}
              <div className="hidden md:flex flex-col leading-tight">
                <span className="text-xs font-bold text-gray-900">
                  Welcome, {userDisplayName || config.roleDisplayName}
                </span>
                <span className="text-[11px] text-gray-500 font-medium">
                  {config.roleTitle}
                </span>
              </div>
            </div>

            {/* 4. RED LOGOUT BUTTON */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleSignOut}
              className="px-3 sm:px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer ml-1"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </motion.button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            3. MAIN CONTENT CONTAINER (Tab-driven)
        ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Section 4: Dashboard Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    Dashboard
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">
                    Welcome back, <span className="font-semibold text-gray-800">{userDisplayName || config.roleDisplayName}</span>. {config.greetingSubtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-[11px] text-gray-400">
                    Last updated: <span className="font-medium text-gray-600">{lastUpdated}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Refresh Microgrid Telemetry"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Section 5: 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {config.kpis.map((kpi) => (
                  <KpiCard
                    key={kpi.id}
                    metric={kpi}
                    onClick={() => {
                      if (kpi.targetTab) {
                        setActiveTab(kpi.targetTab)
                      }
                    }}
                  />
                ))}
              </div>

              {/* Middle Row: Reservation Overview + Station Status */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Section 8: Reservation Overview */}
                <div className="lg:col-span-7">
                  <ReservationChart stats={stats} />
                </div>

                {/* Section 7: Station Status Overview */}
                <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Station Status</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Microgrid charging & injection nodes</p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {activeStations.length} of {stations.length} Online
                      </span>
                    </div>

                    {/* Active vs Inactive visual meter */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-emerald-500" />
                        <div>
                          <span className="text-xs text-gray-500 block">Active Nodes</span>
                          <span className="text-lg font-bold text-emerald-800">{activeStations.length} Active</span>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-rose-400" />
                        <div>
                          <span className="text-xs text-gray-500 block">Inactive / Maint.</span>
                          <span className="text-lg font-bold text-gray-700">{inactiveStations.length} Inactive</span>
                        </div>
                      </div>
                    </div>

                    {/* Microgrid Station table */}
                    <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                      {stations.slice(0, 3).map((st) => (
                        <div key={st.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-gray-900 block">{st.name}</span>
                            <span className="text-[11px] text-gray-400">{st.powerType} • {st.operatingHours}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                st.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              ● {st.status}
                            </span>
                            <span className="text-[11px] font-mono text-gray-500">{st.slots} Slots</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('stations')}
                    className="mt-4 text-xs font-bold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer self-start"
                  >
                    <span>View All Stations</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Lower Row: Recent Activity + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Section 9: Recent System Activity */}
                <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Recent Activity</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Audit log of system events & node dispatches</p>
                    </div>
                    <span className="text-[11px] text-gray-400">Real-time feed</span>
                  </div>

                  <div className="space-y-4">
                    {activity.map((act) => (
                      <div key={act.id} className="flex items-start gap-3 text-xs">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            act.type === 'activation'
                              ? 'bg-emerald-500'
                              : act.type === 'station'
                              ? 'bg-blue-500'
                              : act.type === 'deactivation'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 leading-snug">{act.title}</p>
                          {act.description && (
                            <p className="text-[11px] text-gray-400 mt-0.5">{act.description}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{act.timeAgo}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 10: Quick Actions */}
                <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Quick Actions</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      {activeRole === 'Backoffice'
                        ? 'Administrative microgrid controls & registration'
                        : 'Operator station dispatch & queue operations'}
                    </p>

                    <div className="space-y-2.5">
                      {config.quickActions.map((qa) => (
                        <button
                          key={qa.id}
                          type="button"
                          onClick={() => handleQuickActionClick(qa.actionType)}
                          className="w-full p-3 rounded-lg border border-gray-200 hover:border-[var(--color-primary)] hover:bg-emerald-50/30 text-left text-xs font-semibold text-gray-800 transition-all flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            {renderQuickActionIcon(qa.icon)}
                            <span className="group-hover:text-[var(--color-primary)] transition-colors">
                              {qa.label}
                            </span>
                          </div>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                    Role-isolated permission scope active
                  </div>
                </div>
              </div>

              {/* Section 6: Pending Prosumer Approval Section (Only for Admin) */}
              {activeRole === 'Backoffice' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-gray-900 leading-tight">Pending Prosumer Requests</h3>
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                          {pendingProsumers.length} Pending
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Rooftop solar generator accounts awaiting grid interconnection authorization
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('prosumers')
                        setProsumerStatusFilter('Pending')
                      }}
                      className="text-xs font-bold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                          <th className="pb-3 font-semibold">Name</th>
                          <th className="pb-3 font-semibold">NIC</th>
                          <th className="pb-3 font-semibold">Registered</th>
                          <th className="pb-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pendingProsumers.slice(0, 3).map((pros) => (
                          <tr key={pros.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-3 font-semibold text-gray-800">
                              {pros.name}
                              <span className="block text-[11px] font-normal text-gray-400">{pros.phone}</span>
                            </td>
                            <td className="py-3 font-mono text-gray-600">{pros.nic}</td>
                            <td className="py-3 text-gray-500">{pros.registeredDate}</td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProsumer(pros)
                                  setIsProsumerModalOpen(true)
                                }}
                                className="px-3 py-1.5 rounded-md text-xs font-bold text-[var(--color-primary)] bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>View</span>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: USERS VIEW (Section 11) */}
          {activeTab === 'users' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">User Management</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Backoffice staff, Grid Operators, and Prosumer accounts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentQuickAction('createUser')
                    setIsQuickActionModalOpen(true)
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-xs transition-all inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create User</span>
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
                <div className="w-full sm:w-72 relative">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="w-full px-3.5 py-2 pl-9 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs text-gray-500 font-semibold">Filter:</span>
                  {(['All', 'Backoffice', 'Grid Operator', 'Prosumer'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setUserRoleFilter(r)}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                        userRoleFilter === r
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold">
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.email} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-semibold text-gray-800">
                          {u.name}
                          <span className="block text-[11px] text-gray-400 font-normal">{u.email}</span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.role === 'Backoffice'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'Grid Operator'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            ● {u.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => toast.success(`Viewing profile for ${u.name}`)}
                            className="text-gray-500 hover:text-gray-900 font-bold px-2 py-1"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 3: PROSUMER REQUESTS VIEW */}
          {activeTab === 'prosumers' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Prosumer Requests</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Review and authorize rooftop solar grid interconnections
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(['Pending', 'Active', 'Deactivated', 'All'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setProsumerStatusFilter(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        prosumerStatusFilter === st
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prosumer Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prosumers
                  .filter((p) => prosumerStatusFilter === 'All' || p.status === prosumerStatusFilter)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="border border-gray-200 rounded-xl p-5 hover:border-[var(--color-primary)] transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-gray-900">{p.name}</h4>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              p.status === 'Pending'
                                ? 'bg-amber-100 text-amber-800'
                                : p.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            ● {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono">NIC: {p.nic}</p>
                        <p className="text-xs text-gray-500 mt-1">Registered: {p.registeredDate}</p>
                        <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-xs space-y-1">
                          <span className="text-gray-500 block">
                            Capacity: <strong className="text-gray-900">{p.solarCapacityKw} kW PV</strong>
                          </span>
                          <span className="text-gray-500 block truncate">Inverter: {p.inverterModel}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">{p.phone}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProsumer(p)
                            setIsProsumerModalOpen(true)
                          }}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-xs transition-all"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* TAB 4: STATIONS VIEW (Section 11) */}
          {activeTab === 'stations' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Microgrid Stations</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Distributed energy transfer nodes and transformer substations
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentQuickAction('addStation')
                    setIsQuickActionModalOpen(true)
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Station</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stations.map((st) => (
                  <div
                    key={st.id}
                    className="border border-gray-200 rounded-xl p-5 hover:border-[var(--color-primary)] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {st.code}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            st.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          ● {st.status}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-gray-900">{st.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{st.location}</p>

                      <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Power Type</span>
                          <span className="font-semibold text-gray-800">{st.powerType}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Operating Hours</span>
                          <span className="font-semibold text-gray-800">{st.operatingHours}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Slots: <strong>{st.slots}</strong></span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStationStatus(st.id)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-200 hover:bg-gray-100"
                        >
                          {st.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.success(`Editing configuration for ${st.name}`)}
                          className="px-3 py-1.5 rounded-md text-xs font-bold text-[var(--color-primary)] bg-emerald-50 hover:bg-emerald-100"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 5: SLOTS VIEW (Section 11) */}
          {activeTab === 'slots' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Slot Management</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Microgrid charging and transfer slot allocations
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentQuickAction('manageSlots')
                    setIsQuickActionModalOpen(true)
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-xs"
                >
                  Configure Timetable
                </button>
              </div>

              {/* Station & Date Picker */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center gap-4 text-xs font-semibold">
                <div>
                  <span className="text-gray-500 block mb-1">Station:</span>
                  <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs">
                    <option>Node 001 - Malabe</option>
                    <option>Node 002 - Kaduwela</option>
                    <option>Node 003 - Matara</option>
                  </select>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Date:</span>
                  <input
                    type="date"
                    defaultValue="2026-09-21"
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Hourly Slot availability list */}
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-xs">
                {[
                  { time: '08:00 - 09:00', status: 'Available', color: 'emerald' },
                  { time: '09:00 - 10:00', status: 'Available', color: 'emerald' },
                  { time: '10:00 - 11:00', status: 'Full (3/3)', color: 'rose' },
                  { time: '11:00 - 12:00', status: 'Available', color: 'emerald' },
                  { time: '12:00 - 13:00', status: 'Unavailable', color: 'gray' },
                  { time: '13:00 - 14:00', status: 'Available', color: 'emerald' },
                ].map((s) => (
                  <div key={s.time} className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                    <span className="font-mono font-bold text-gray-800">{s.time}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        s.color === 'emerald'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.color === 'rose'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 6: SETTINGS VIEW */}
          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-5"
            >
              <div className="pb-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">System & Account Settings</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure administrative credentials and microgrid tariff telemetry
                </p>
              </div>

              <div className="space-y-4 max-w-xl text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Administrator Name</label>
                  <input
                    type="text"
                    defaultValue={userDisplayName || 'Admin'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">NIC Identifier</label>
                  <input
                    type="text"
                    disabled
                    value={userNic || 'ADMIN-SYSTEM-ROOT'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">CEB Microgrid Interconnect ID</label>
                  <input
                    type="text"
                    defaultValue="CEB-LK-WP-WEST-01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => toast.success('Settings updated successfully!')}
                    className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 7: OPERATOR QUEUE / TRANSFERS (Only if activeRole === 'GridOperator') */}
          {activeRole === 'GridOperator' && (activeTab === 'queue' || activeTab === 'transfers') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {activeTab === 'queue' ? "Today's Dispatch Queue" : 'Active Energy Transfers'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Live telemetry for Node 001 - Malabe Inverter Terminal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentQuickAction('scanQr')
                    setIsQuickActionModalOpen(true)
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span>Scan QR Code</span>
                </button>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-xs">
                {[
                  { id: 'TX-1049', user: 'Kasun Silva', slot: '12:00 - 13:00', type: 'Export (Selling)', kw: '4.8 kW', status: 'Transferring' },
                  { id: 'TX-1050', user: 'Amal Perera', slot: '13:00 - 14:00', type: 'Charging (Buying)', kw: '7.2 kW', status: 'Queued' },
                  { id: 'TX-1051', user: 'Nimal Perera', slot: '14:00 - 15:00', type: 'Export (Selling)', kw: '3.6 kW', status: 'Queued' },
                ].map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <span className="font-mono text-[10px] text-gray-400 block">{tx.id}</span>
                      <span className="font-bold text-gray-900">{tx.user}</span>
                      <span className="text-[11px] text-gray-500 block">{tx.slot} • {tx.type}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-emerald-700">{tx.kw}</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          tx.status === 'Transferring'
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        ● {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MODALS
      ───────────────────────────────────────────────────────────── */}
      {/* Prosumer Details Modal */}
      <ProsumerDetailModal
        isOpen={isProsumerModalOpen}
        prosumer={selectedProsumer}
        onClose={() => setIsProsumerModalOpen(false)}
        onActivate={handleActivateProsumer}
        onDeactivate={handleDeactivateProsumer}
      />

      {/* Quick Action Modal (Create User, Add Station, Scan QR, etc.) */}
      <QuickActionModal
        isOpen={isQuickActionModalOpen}
        actionType={currentQuickAction}
        onClose={() => setIsQuickActionModalOpen(false)}
        onSuccess={(_msg, createdUser) => {
          if (createdUser) {
            const roleLabel = createdUser.role === 'GridOperator' ? 'Grid Operator' : 'Backoffice'
            setUsersList((prev) => [
              {
                name: createdUser.fullName,
                role: roleLabel,
                email: createdUser.email,
                status: createdUser.status,
              },
              ...prev,
            ])
            setActivity((prev) => [
              {
                id: `act-${Date.now()}`,
                title: `${roleLabel} Account Created`,
                description: `${createdUser.fullName} (${createdUser.email}) registered in microgrid system`,
                timeAgo: 'Just now',
                type: 'user',
              },
              ...prev,
            ])
          }
        }}
      />
    </div>
  )
}
