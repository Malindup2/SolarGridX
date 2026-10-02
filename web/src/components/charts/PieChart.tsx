import { useId, useState, type ReactNode } from 'react'

export interface PieChartSlice {
  label: string
  value: number
  color: string
  hint?: string
}

export interface PieChartProps {
  data: PieChartSlice[]
  centerLabel?: string
  centerValue?: ReactNode
  size?: number
  donutThickness?: number
  showLegend?: boolean
  className?: string
}

export function PieChart({
  data,
  centerLabel,
  centerValue,
  size = 220,
  donutThickness = 32,
  showLegend = true,
  className = '',
}: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const chartId = useId()

  const total = data.reduce((acc, slice) => acc + Math.max(0, slice.value), 0)

  if (total === 0 || data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
        <div
          className="flex items-center justify-center rounded-full border-2 border-dashed border-[var(--color-border)] text-xs text-[var(--color-muted)]"
          style={{ width: size, height: size }}
        >
          No data available
        </div>
      </div>
    )
  }

  const radius = size / 2
  const innerRadius = radius - donutThickness

  // Calculate slice geometry
  let currentAngle = -Math.PI / 2 // Start at top (12 o'clock)

  const slices = data.map((slice, index) => {
    const value = Math.max(0, slice.value)
    const angleSpan = (value / total) * (2 * Math.PI)
    const startAngle = currentAngle
    const endAngle = currentAngle + angleSpan
    currentAngle = endAngle

    const isHovered = hoveredIndex === index
    const rOuter = isHovered ? radius + 4 : radius
    const rInner = isHovered ? Math.max(0, innerRadius - 2) : innerRadius

    // Large arc flag is 1 if angle > 180 deg
    const largeArcFlag = angleSpan > Math.PI ? 1 : 0

    const x1 = radius + rOuter * Math.cos(startAngle)
    const y1 = radius + rOuter * Math.sin(startAngle)
    const x2 = radius + rOuter * Math.cos(endAngle)
    const y2 = radius + rOuter * Math.sin(endAngle)

    const x3 = radius + rInner * Math.cos(endAngle)
    const y3 = radius + rInner * Math.sin(endAngle)
    const x4 = radius + rInner * Math.cos(startAngle)
    const y4 = radius + rInner * Math.sin(startAngle)

    // Full 360 circle special case
    let pathData = ''
    if (angleSpan >= 2 * Math.PI - 0.0001) {
      pathData = `
        M ${radius} ${radius - rOuter}
        A ${rOuter} ${rOuter} 0 1 0 ${radius} ${radius + rOuter}
        A ${rOuter} ${rOuter} 0 1 0 ${radius} ${radius - rOuter}
        M ${radius} ${radius - rInner}
        A ${rInner} ${rInner} 0 1 1 ${radius} ${radius + rInner}
        A ${rInner} ${rInner} 0 1 1 ${radius} ${radius - rInner}
        Z
      `
    } else {
      pathData = `
        M ${x1} ${y1}
        A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${x2} ${y2}
        L ${x3} ${y3}
        A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${x4} ${y4}
        Z
      `
    }

    const percentage = ((value / total) * 100).toFixed(1)

    return {
      ...slice,
      percentage,
      pathData,
      index,
    }
  })

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null

  return (
    <div className={`flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-around ${className}`}>
      {/* SVG Donut */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={size + 16}
          height={size + 16}
          viewBox={`-8 -8 ${size + 16} ${size + 16}`}
          className="overflow-visible"
        >
          {slices.map((slice) => (
            <path
              key={`${chartId}-${slice.index}`}
              d={slice.pathData}
              fill={slice.color}
              className="cursor-pointer transition-all duration-200 hover:opacity-95"
              style={{
                filter: hoveredIndex === slice.index ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))' : 'none',
              }}
              onMouseEnter={() => setHoveredIndex(slice.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>

        {/* Center content */}
        <div
          className="pointer-events-none absolute flex flex-col items-center justify-center text-center"
          style={{ width: innerRadius * 2 - 12, height: innerRadius * 2 - 12 }}
        >
          {activeSlice ? (
            <>
              <span className="text-xl font-bold text-[var(--color-ink)]">{activeSlice.value}</span>
              <span className="text-xs font-semibold text-[var(--color-muted)]">{activeSlice.percentage}%</span>
              <span className="truncate max-w-[90px] text-[11px] text-[var(--color-muted)]">{activeSlice.label}</span>
            </>
          ) : (
            <>
              {centerValue ? (
                <span className="text-xl font-bold text-[var(--color-ink)]">{centerValue}</span>
              ) : (
                <span className="text-xl font-bold text-[var(--color-ink)]">{total}</span>
              )}
              {centerLabel && <span className="text-xs font-medium text-[var(--color-muted)]">{centerLabel}</span>}
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-col gap-2.5 w-full max-w-[220px]">
          {slices.map((slice) => {
            const isHovered = hoveredIndex === slice.index
            return (
              <div
                key={slice.label}
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer ${
                  isHovered ? 'bg-[var(--color-background)] font-medium shadow-xs' : 'hover:bg-[var(--color-background)]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate text-sm text-[var(--color-ink)]">{slice.label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
                  <span className="font-semibold text-[var(--color-ink)]">{slice.value}</span>
                  <span className="text-xs opacity-75">({slice.percentage}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
