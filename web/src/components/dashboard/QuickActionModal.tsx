import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isAxiosError } from 'axios'
import toast from 'react-hot-toast'
import { userService } from '../../services/userService'
import type { UserResponse } from '../../types/user'
import type { ApiErrorResponse } from '../../types/auth'

export type QuickActionType =
  | 'createUser'
  | 'addStation'
  | 'manageSlots'
  | 'reviewProsumers'
  | 'scanQr'
  | 'dispatchEnergy'
  | 'viewQueue'
  | 'emergencyCutoff'

interface QuickActionModalProps {
  actionType: QuickActionType | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (message: string, createdUser?: UserResponse) => void
}

export default function QuickActionModal({
  actionType,
  isOpen,
  onClose,
  onSuccess,
}: QuickActionModalProps) {
  // Form states for Create User
  const [userRole, setUserRole] = useState<'GridOperator' | 'Backoffice'>('GridOperator')
  const [userFullName, setUserFullName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userNic, setUserNic] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states for Add Station
  const [stationCode, setStationCode] = useState('')
  const [stationName, setStationName] = useState('')
  const [stationLocation, setStationLocation] = useState('')
  const [stationSlots, setStationSlots] = useState('8')
  const [powerType, setPowerType] = useState('AC 230V')

  // States for Manage Slots
  const [selectedStation, setSelectedStation] = useState('Node 001 - Malabe')
  const [selectedDate, setSelectedDate] = useState('2026-09-21')

  if (!isOpen || !actionType) return null

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userFullName.trim() || !userEmail.trim()) {
      toast.error('Please enter full name and email')
      return
    }

    if (!userPassword || userPassword.length < 8) {
      toast.error('Temporary password must be at least 8 characters long')
      return
    }

    if (userNic.trim() && !/^([0-9]{9}[vVxX]|[0-9]{12})$/.test(userNic.trim())) {
      toast.error('NIC must be in a valid format (9 digits + V/X or 12 digits)')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await userService.createUser({
        fullName: userFullName.trim(),
        email: userEmail.trim(),
        password: userPassword,
        role: userRole,
        nic: userNic.trim() || null,
        phone: userPhone.trim() || null,
      })

      toast.success(`${userRole === 'GridOperator' ? 'Grid Operator' : 'Administrator'} account for ${created.fullName} created successfully!`)
      onSuccess?.(`User ${created.fullName} created`, created)

      // Reset form
      setUserFullName('')
      setUserEmail('')
      setUserNic('')
      setUserPhone('')
      setUserPassword('')
      onClose()
    } catch (err: unknown) {
      if (isAxiosError<ApiErrorResponse>(err)) {
        const resp = err.response?.data
        if (resp?.code === 'NIC_ALREADY_REGISTERED') {
          toast.error('This NIC is already registered in the system.')
        } else if (resp?.code === 'EMAIL_ALREADY_REGISTERED') {
          toast.error('This email address is already registered.')
        } else if (resp?.details && resp.details.length > 0) {
          resp.details.forEach((d) => toast.error(d))
        } else {
          toast.error(resp?.message || 'Failed to create user. Please check your inputs.')
        }
      } else {
        toast.error('An unexpected error occurred while creating user.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddStationSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!stationCode || !stationName || !stationLocation) {
      toast.error('Please enter all station details')
      return
    }
    toast.success(`Microgrid Node ${stationCode} added to the grid!`)
    onSuccess?.(`Station ${stationCode} registered`)
    onClose()
  }

  const handleDispatchFeeder = () => {
    toast.success('Dispatched 25 kW flow to Feeder Node #1')
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <h3 className="text-base font-bold text-gray-900">
              {actionType === 'createUser' && 'Create New User Account'}
              {actionType === 'addStation' && 'Register Microgrid Station'}
              {actionType === 'manageSlots' && 'Slot Allocation & Timetable'}
              {actionType === 'scanQr' && 'Scan Reservation QR Code'}
              {actionType === 'dispatchEnergy' && 'Manual Feeder Energy Dispatch'}
              {actionType === 'emergencyCutoff' && 'Emergency Grid Isolation Warning'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 flex items-center justify-center cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* 1. Create User Modal Form */}
            {actionType === 'createUser' && (
              <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Account Role <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { role: 'GridOperator', label: 'Grid Operator', desc: 'Regional telemetry & dispatch' },
                      { role: 'Backoffice', label: 'System Admin', desc: 'System governance & admin' },
                    ] as const).map(({ role, label, desc }) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setUserRole(role)}
                        className={`py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer ${
                          userRole === role
                            ? 'bg-emerald-50 border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xs font-bold block">{label}</span>
                        <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userFullName}
                    onChange={(e) => setUserFullName(e.target.value)}
                    placeholder="e.g. Sunil Wickramasinghe"
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">NIC Number</label>
                    <input
                      type="text"
                      value={userNic}
                      onChange={(e) => setUserNic(e.target.value.toUpperCase())}
                      placeholder="e.g. 199512345678"
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Work Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="operator@solargridx.lk"
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="+94 77 123 4567"
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Temporary Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full px-3.5 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[11px] text-emerald-800 leading-tight">
                    An activation email will be sent automatically. The new operator will be required to change their temporary password upon initial login.
                  </span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <span>Create {userRole === 'GridOperator' ? 'Grid Operator' : 'Admin'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* 2. Add Station Modal Form */}
            {actionType === 'addStation' && (
              <form onSubmit={handleAddStationSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Station Code</label>
                    <input
                      type="text"
                      required
                      value={stationCode}
                      onChange={(e) => setStationCode(e.target.value)}
                      placeholder="Node 005"
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Power Output</label>
                    <select
                      value={powerType}
                      onChange={(e) => setPowerType(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] bg-white"
                    >
                      <option value="AC 230V">AC 230V (Single Phase)</option>
                      <option value="DC Fast">DC Fast (CCS2 / CHAdeMO)</option>
                      <option value="Hybrid 400V">Hybrid 400V 3-Phase</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Station Name</label>
                  <input
                    type="text"
                    required
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder="Node 005 - Homagama Microgrid"
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Physical Location & Feeder</label>
                  <input
                    type="text"
                    required
                    value={stationLocation}
                    onChange={(e) => setStationLocation(e.target.value)}
                    placeholder="Homagama Tech City Hub, Substation #4"
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Default Daily Slots</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={stationSlots}
                    onChange={(e) => setStationSlots(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg shadow-sm"
                  >
                    Add Station
                  </button>
                </div>
              </form>
            )}

            {/* 3. Manage Slots Preview */}
            {actionType === 'manageSlots' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Station</label>
                    <select
                      value={selectedStation}
                      onChange={(e) => setSelectedStation(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white"
                    >
                      <option value="Node 001 - Malabe">Node 001 - Malabe</option>
                      <option value="Node 002 - Kaduwela">Node 002 - Kaduwela</option>
                      <option value="Node 003 - Matara">Node 003 - Matara</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                  <div className="bg-gray-50 px-3 py-2 font-bold text-gray-700 border-b border-gray-100 flex justify-between">
                    <span>Hourly Schedule</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <div className="px-3 py-2 flex justify-between items-center">
                      <span className="font-mono">08:00 - 09:00</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Available</span>
                    </div>
                    <div className="px-3 py-2 flex justify-between items-center">
                      <span className="font-mono">09:00 - 10:00</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Available</span>
                    </div>
                    <div className="px-3 py-2 flex justify-between items-center">
                      <span className="font-mono">10:00 - 11:00</span>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">Full (3/3)</span>
                    </div>
                    <div className="px-3 py-2 flex justify-between items-center">
                      <span className="font-mono">11:00 - 12:00</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Available</span>
                    </div>
                    <div className="px-3 py-2 flex justify-between items-center">
                      <span className="font-mono">12:00 - 13:00</span>
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">Unavailable</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      toast.success('Slots updated successfully!')
                      onClose()
                    }}
                    className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg"
                  >
                    Save Slot Configuration
                  </button>
                </div>
              </div>
            )}

            {/* 4. Scan QR (Operator mode) */}
            {actionType === 'scanQr' && (
              <div className="space-y-4 text-center py-4">
                <div className="w-32 h-32 mx-auto border-2 border-dashed border-[var(--color-primary)] rounded-xl flex items-center justify-center bg-emerald-50/50">
                  <svg className="w-12 h-12 text-[var(--color-primary)] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600">
                  Point the terminal optical scanner at the prosumer's reservation QR code.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    toast.success('QR Scanned: Reservation #RES-9082 verified!')
                    onClose()
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] rounded-lg"
                >
                  Simulate QR Verification
                </button>
              </div>
            )}

            {/* 5. Dispatch Feeder Flow */}
            {actionType === 'dispatchEnergy' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-600">
                  Manual feeder dispatch command initiates power routing between Malabe microgrid accumulator and local CEB substation transformer.
                </p>
                <div className="p-3 bg-emerald-50 rounded-lg text-xs font-semibold text-emerald-800">
                  Available Solar Reserve: 48.2 kWh (Feeder #1 Nominal)
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-gray-600">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDispatchFeeder}
                    className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] rounded-lg"
                  >
                    Confirm Dispatch Flow
                  </button>
                </div>
              </div>
            )}

            {/* 6. Emergency Cutoff */}
            {actionType === 'emergencyCutoff' && (
              <div className="space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Extreme Precaution Required</span>
                  </div>
                  This triggers islanding isolation for the selected node immediately. Any active vehicle charging or rooftop grid export will be safely ramped down.
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-gray-600">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.error('Emergency Islanding Protocol Engaged')
                      onClose()
                    }}
                    className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                  >
                    Isolate Microgrid Node
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
