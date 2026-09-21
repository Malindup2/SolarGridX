import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

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
  onSuccess?: (message: string) => void
}

export default function QuickActionModal({
  actionType,
  isOpen,
  onClose,
  onSuccess,
}: QuickActionModalProps) {
  // Form states for Create User
  const [userRole, setUserRole] = useState<'Backoffice' | 'GridOperator' | 'Prosumer'>('GridOperator')
  const [userFullName, setUserFullName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userNic, setUserNic] = useState('')

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

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userFullName || !userEmail || !userNic) {
      toast.error('Please complete all required fields')
      return
    }
    toast.success(`User ${userFullName} (${userRole}) created successfully!`)
    onSuccess?.(`User ${userFullName} created`)
    onClose()
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['GridOperator', 'Backoffice', 'Prosumer'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setUserRole(r)}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                          userRole === r
                            ? 'bg-emerald-50 border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {r === 'GridOperator' ? 'Grid Operator' : r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
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
                      required
                      value={userNic}
                      onChange={(e) => setUserNic(e.target.value)}
                      placeholder="199512345678"
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email</label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="sunil@solargridx.lk"
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
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
                    Create User
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
