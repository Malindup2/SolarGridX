import { motion } from 'framer-motion'
import type { KpiMetric } from './dashboardConfig'

interface KpiCardProps {
  metric: KpiMetric
  onClick?: () => void
}

export default function KpiCard({ metric, onClick }: KpiCardProps) {
  // Determine color accents
  const getThemeClasses = () => {
    switch (metric.colorTheme) {
      case 'amber':
        return {
          iconBg: 'bg-amber-100 text-amber-600',
          border: 'hover:border-amber-400',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          indicator: 'bg-amber-500',
        }
      case 'emerald':
        return {
          iconBg: 'bg-emerald-100 text-emerald-600',
          border: 'hover:border-emerald-400',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          indicator: 'bg-emerald-500',
        }
      case 'purple':
        return {
          iconBg: 'bg-purple-100 text-purple-600',
          border: 'hover:border-purple-400',
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
          indicator: 'bg-purple-500',
        }
      case 'blue':
      default:
        return {
          iconBg: 'bg-blue-100 text-blue-600',
          border: 'hover:border-blue-400',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          indicator: 'bg-blue-500',
        }
    }
  }

  const theme = getThemeClasses()

  const renderIcon = () => {
    switch (metric.icon) {
      case 'users':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'user-check':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'zap':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      case 'check-circle':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      case 'calendar':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'activity':
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )
    }
  }

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`bg-white border border-[var(--color-border)] rounded-xl p-5 shadow-sm transition-all cursor-pointer relative overflow-hidden group ${theme.border}`}
    >
      {/* Top row: Title and Icon */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-h-[2.25rem] flex items-center leading-tight">
          {metric.title}
        </span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${theme.iconBg}`}>
          {renderIcon()}
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {metric.value}
        </span>
      </div>

      {/* Subtitle / Status indicator */}
      <div className="flex items-center gap-1.5 text-xs">
        {metric.requiresAttention ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
            {metric.subtitle}
          </span>
        ) : (
          <span className="text-gray-500 font-medium flex items-center gap-1">
            {metric.isPositive && (
              <span className="text-emerald-600 font-semibold">↑</span>
            )}
            {metric.subtitle}
          </span>
        )}
      </div>

      {/* Subtle indicator bar at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
        <div className={`h-full w-full opacity-0 group-hover:opacity-100 transition-opacity ${theme.indicator}`} />
      </div>
    </motion.div>
  )
}
