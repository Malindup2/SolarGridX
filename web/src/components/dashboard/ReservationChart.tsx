import { motion } from 'framer-motion'
import type { ReservationStats } from './dashboardConfig'

interface ReservationChartProps {
  stats: ReservationStats
}

export default function ReservationChart({ stats }: ReservationChartProps) {
  const statusItems = [
    { label: 'Pending', count: stats.pending, color: 'text-amber-600', dot: 'bg-amber-500' },
    { label: 'Approved', count: stats.approved, color: 'text-emerald-600', dot: 'bg-emerald-500' },
    { label: 'Completed', count: stats.completed, color: 'text-blue-600', dot: 'bg-blue-500' },
    { label: 'Rejected', count: stats.rejected, color: 'text-rose-600', dot: 'bg-rose-500' },
    { label: 'Cancelled', count: stats.cancelled, color: 'text-gray-500', dot: 'bg-gray-400' },
  ]

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Reservation Overview</h3>
            <p className="text-xs text-gray-500 mt-0.5">High-level microgrid reservation volume across all nodes</p>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded bg-gray-100 text-gray-600">
            This Week
          </span>
        </div>

        {/* Status Count Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 border-y border-gray-100 mb-5">
          {statusItems.map((item) => (
            <div key={item.label} className="flex flex-col">
              <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                {item.label}
              </span>
              <span className={`text-xl font-bold mt-1 ${item.color}`}>
                {item.count}
              </span>
            </div>
          ))}
        </div>

        {/* Mini Visual Bar Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Daily Volume Trend</span>
            <span className="text-[11px] text-gray-400">Peak: Wed ({stats.chartData[2]?.count} transfers)</span>
          </div>

          <div className="h-32 flex items-end justify-between gap-2 pt-4 px-2 bg-gray-50/70 rounded-lg border border-gray-100">
            {stats.chartData.map((item, idx) => (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.count}
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${item.heightPercent}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  className={`w-full max-w-[28px] rounded-t-md transition-all ${
                    item.day === 'Wed'
                      ? 'bg-[var(--color-primary)] shadow-sm'
                      : 'bg-emerald-400/80 group-hover:bg-emerald-500'
                  }`}
                />
                <span className="text-[11px] font-semibold text-gray-600 pb-1.5">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>Monitoring & System Telemetry</span>
        <span className="text-gray-500 font-medium">Auto-synced with Operator Feeder API</span>
      </div>
    </div>
  )
}
