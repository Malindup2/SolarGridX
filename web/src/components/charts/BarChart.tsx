import { useId, useState } from 'react'

export interface BarChartItem {
  label: string
  value: number
  subLabel?: string
  color?: string
  hint?: string
}

export interface BarChartProps {
  data: BarChartItem[]
  unit?: string
  height?: number
  defaultColor?: string
  className?: string
}

export function BarChart({
  data,
  unit = '',
  height = 200,
  defaultColor = 'var(--color-primary)',
  className = '',
}: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const chartId = useId()

  const maxValue = Math.max(1, ...data.map((d) => d.value))
  // Round upper grid line to a friendly number
  const topScale = Math.ceil(maxValue * 1.1)

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center p-6 text-center text-sm text-[var(--color-muted)] ${className}`}>
        No data available
      </div>
    )
  }

  const gridSteps = [topScale, Math.round(topScale * 0.66), Math.round(topScale * 0.33), 0]

  return (
    <div className={`w-full ${className}`}>
      {/* Chart Canvas Area */}
      <div className="relative flex items-end gap-2 pt-8 pb-6" style={{ height }}>
        {/* Horizontal background gridlines */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6 pt-8">
          {gridSteps.map((stepVal, idx) => (
            <div key={idx} className="relative flex w-full items-center">
              <span className="absolute -left-1 text-[10px] font-medium text-[var(--color-muted)] opacity-60">
                {stepVal}
              </span>
              <div className="ml-6 w-full border-b border-dashed border-[var(--color-border)] opacity-60" />
            </div>
          ))}
        </div>

        {/* Bars Container */}
        <div className="relative z-10 ml-6 flex h-full w-full items-end justify-between gap-2 sm:gap-3">
          {data.map((item, index) => {
            const isHovered = hoveredIndex === index
            const heightPercent = Math.max(4, Math.min(100, (item.value / topScale) * 100))
            const barColor = item.color || defaultColor

            return (
              <div
                key={`${chartId}-${index}`}
                className="relative flex flex-1 flex-col items-center justify-end h-full group"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute -top-10 z-30 flex flex-col items-center pointer-events-none transition-all duration-150 transform -translate-y-1">
                    <div className="rounded-md bg-[var(--color-secondary)] px-2.5 py-1 text-xs text-white shadow-lg whitespace-nowrap">
                      <span className="font-bold">{item.value}</span> {unit}
                      {item.hint && <span className="block text-[10px] text-slate-300">{item.hint}</span>}
                    </div>
                    <div className="h-1.5 w-1.5 rotate-45 bg-[var(--color-secondary)] -mt-0.5" />
                  </div>
                )}

                {/* Animated Bar */}
                <div
                  className="w-full max-w-[42px] min-w-[14px] rounded-t-md transition-all duration-300 cursor-pointer"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: barColor,
                    opacity: hoveredIndex === null || isHovered ? 1 : 0.45,
                    transform: isHovered ? 'scaleY(1.03)' : 'scaleY(1)',
                    transformOrigin: 'bottom',
                    filter: isHovered ? 'drop-shadow(0 4px 8px rgba(73,176,45,0.3))' : 'none',
                  }}
                />

                {/* Bottom X-Axis Label */}
                <div className="absolute -bottom-6 flex flex-col items-center">
                  <span
                    className={`text-[11px] truncate max-w-[54px] transition-colors ${
                      isHovered ? 'font-bold text-[var(--color-ink)]' : 'text-[var(--color-muted)]'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.subLabel && (
                    <span className="text-[9px] text-[var(--color-muted)] opacity-70">{item.subLabel}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
