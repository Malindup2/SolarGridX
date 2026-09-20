import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import StatusBadge from '../components/StatusBadge'

interface DashboardStubProps {
  roleName: string
}

export default function DashboardStub({ roleName }: DashboardStubProps) {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()

  const isProsumer = roleName === 'Prosumer' || auth?.role === 'Prosumer'
  const isPending = (auth?.status === 'Pending') || (isProsumer && auth?.status !== 'Active')

  useEffect(() => {
    if (isPending) {
      toast(
        'Access Restricted: You do not have permission to perform microgrid operations until an administrator has approved your account.',
        {
          id: 'pending-approval-toast',
          icon: '⏳',
          duration: 7000,
        }
      )
    }
  }, [isPending])

  const handleLogout = () => {
    logout()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  const handleActionClick = (actionName: string) => {
    if (isPending) {
      toast.error(
        `Access Restricted: You cannot perform "${actionName}" until an administrator has approved your account.`,
        {
          id: `action-restricted-${actionName}`,
          duration: 5000,
        }
      )
    } else {
      toast.success(`Action initiated: ${actionName}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Pending Approval Notice Banner */}
      {isPending && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] p-5 flex flex-col sm:flex-row items-start gap-4 shadow-sm"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-amber-900">Account Pending Administrator Approval</h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 border border-amber-300">
                Restricted Mode
              </span>
            </div>
            <p className="text-sm text-amber-800/90 mt-1 leading-relaxed">
              Your household solar generation profile is under review by a Backoffice Administrator. You have read-only access to view grid telemetry and generation metrics. Performing P2P trading, selling power to the microgrid, and manual inverter exports remain locked until your account is approved.
            </p>
          </div>
        </motion.div>
      )}

      {/* Welcome Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-caption uppercase tracking-wider font-semibold text-[var(--color-muted)]">
              {roleName} Portal
            </span>
            <StatusBadge status={isPending ? 'Pending' : 'Active'} />
          </div>
          <h2 className="text-h2 font-bold text-[var(--color-ink)]">
            Welcome back, {auth?.displayName || 'User'}!
          </h2>
          <p className="text-body text-[var(--color-muted)] mt-1">
            NIC: <span className="font-mono font-medium text-[var(--color-ink)]">{auth?.nic || 'N/A'}</span> • Authenticated via Smart Grid JWT Token
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={handleLogout}
          className="self-start sm:self-center px-4 py-2 rounded-[var(--radius-md)] text-button font-semibold border border-[var(--color-border)] hover:bg-gray-100 transition-colors text-[var(--color-ink)] flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </motion.button>
      </div>

      {/* Telemetry Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-card)]"
        >
          <div className="text-caption font-medium text-[var(--color-muted)] uppercase">Microgrid Status</div>
          <div className="text-h2 font-bold text-[var(--color-primary)] mt-1">Online (50.02 Hz)</div>
          <div className="text-xs text-gray-500 mt-2">Feeder Node #1 Synchronized</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-card)]"
        >
          <div className="text-caption font-medium text-[var(--color-muted)] uppercase">Solar Generation</div>
          <div className="text-h2 font-bold text-[var(--color-ink)] mt-1">4.82 kW</div>
          <div className="text-xs text-emerald-600 mt-2">↑ 12% above daily target</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-card)]"
        >
          <div className="text-caption font-medium text-[var(--color-muted)] uppercase">Energy Trading Balance</div>
          <div className="text-h2 font-bold text-[var(--color-accent)] mt-1">LKR 3,450.00</div>
          <div className="text-xs text-gray-500 mt-2">Next settlement in 4h</div>
        </motion.div>
      </div>

      {/* Prosumer Microgrid Operations & Interactive Controls */}
      {isProsumer && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-card)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-h3 font-bold text-[var(--color-ink)]">Microgrid Operations</h3>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                {isPending
                  ? 'Actions are disabled until administrator approval is granted.'
                  : 'Manage local energy transfers and inverter exports.'}
              </p>
            </div>
            {isPending && (
              <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full font-medium">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Operations Locked
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <button
              type="button"
              onClick={() => handleActionClick('List Surplus Solar')}
              className={`p-4 rounded-[var(--radius-md)] border text-left transition-all flex flex-col justify-between ${
                isPending
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed hover:border-amber-300'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)] bg-white cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[var(--color-ink)]">List Surplus Energy</span>
                {isPending && (
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-500">Sell rooftop kWh to local microgrid participants.</p>
            </button>

            <button
              type="button"
              onClick={() => handleActionClick('Initiate P2P Energy Trade')}
              className={`p-4 rounded-[var(--radius-md)] border text-left transition-all flex flex-col justify-between ${
                isPending
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed hover:border-amber-300'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)] bg-white cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[var(--color-ink)]">P2P Microgrid Trade</span>
                {isPending && (
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-500">Trade surplus solar with adjacent consumer nodes.</p>
            </button>

            <button
              type="button"
              onClick={() => handleActionClick('Dispatch Grid Export')}
              className={`p-4 rounded-[var(--radius-md)] border text-left transition-all flex flex-col justify-between ${
                isPending
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed hover:border-amber-300'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)] bg-white cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[var(--color-ink)]">Grid Export Dispatch</span>
                {isPending && (
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-500">Manual feeder dispatch command to central battery.</p>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
