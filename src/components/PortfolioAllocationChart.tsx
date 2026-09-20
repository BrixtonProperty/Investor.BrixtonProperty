export interface AllocationSlice {
  id: string
  label: string
  value: number
  color: string
}

/** Amber/gold ramp anchored on the brand orange -- darkest for the largest
 * slice, fading to pale gold for the smallest, however many properties there
 * are (sort slices by value descending before assigning colors). */
export function amberShade(index: number, total: number): string {
  const t = total > 1 ? index / (total - 1) : 0
  const lightness = 44 + t * 36
  return `hsl(36, 88%, ${lightness}%)`
}

const R = 52
const CIRCUMFERENCE = 2 * Math.PI * R

export default function PortfolioAllocationChart({
  slices,
  centerNumber,
  centerLabel,
}: {
  slices: AllocationSlice[]
  centerNumber: number
  centerLabel: string
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  let cursor = 0
  const arcs = slices.map((s) => {
    const length = total > 0 ? (s.value / total) * CIRCUMFERENCE : 0
    const dashoffset = -cursor
    cursor += length
    return { ...s, length, dashoffset }
  })

  return (
    <div className="portfolio-donut-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`Portfolio allocation across ${slices.length} properties`}>
        <circle cx="60" cy="60" r={R} fill="#ffffff" />
        {arcs.map((a) => (
          <circle
            key={a.id}
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={a.color}
            strokeWidth="13"
            strokeDasharray={`${a.length} ${CIRCUMFERENCE - a.length}`}
            strokeDashoffset={a.dashoffset}
            transform="rotate(-90 60 60)"
          />
        ))}
      </svg>
      <div className="portfolio-donut-center">
        <div className="num">{centerNumber}</div>
        <div className="cap">{centerLabel}</div>
      </div>
    </div>
  )
}
