import { motion, AnimatePresence } from 'framer-motion'
import type { ProsumerRequest } from './dashboardConfig'

interface ProsumerDetailModalProps {
  prosumer: ProsumerRequest | null
  isOpen: boolean
  onClose: () => void
  onActivate: (prosumer: ProsumerRequest) => void
  onDeactivate: (prosumer: ProsumerRequest) => void
}

export default function ProsumerDetailModal({
  prosumer,
  isOpen,
  onClose,
  onActivate,
  onDeactivate,
}: ProsumerDetailModalProps) {
  if (!isOpen || !prosumer) return null

  const isPending = prosumer.status === 'Pending'
  const isActive = prosumer.status === 'Active'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden"
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                {prosumer.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{prosumer.name}</h3>
                <span className="text-xs text-gray-500 font-mono">NIC: {prosumer.nic}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Status</span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                  isPending
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : isActive
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}
              >
                ● {prosumer.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-500 block">Phone</span>
                <span className="font-medium text-gray-800">{prosumer.phone}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Email</span>
                <span className="font-medium text-gray-800 truncate block">{prosumer.email}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-500 block">Premises Address</span>
                <span className="font-medium text-gray-800">{prosumer.address}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Registered On</span>
                <span className="font-medium text-gray-800">{prosumer.registeredDate}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">CEB Consumer No</span>
                <span className="font-mono text-xs font-semibold text-gray-800">{prosumer.cebAccountNo}</span>
              </div>
            </div>

            {/* Technical PV & Inverter details */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Rooftop Solar PV Array</span>
                <span className="text-xs font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-xs">
                  {prosumer.solarCapacityKw} kW Rated
                </span>
              </div>
              <p className="text-xs text-emerald-800">
                Inverter: <span className="font-medium">{prosumer.inverterModel}</span> (Microgrid Anti-Islanding Compliant)
              </p>
            </div>

            {isPending && (
              <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 leading-relaxed">
                <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Activating this prosumer authorizes their smart meter to inject power into the local microgrid and allows peer-to-peer solar trading.</span>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="p-6 pt-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200/70 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {isActive ? (
              <button
                type="button"
                onClick={() => onDeactivate(prosumer)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                Deactivate Account
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onDeactivate(prosumer)}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => onActivate(prosumer)}
                  className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Activate Account
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
