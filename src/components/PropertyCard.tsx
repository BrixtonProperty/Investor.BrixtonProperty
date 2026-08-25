import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

export interface PropertyCardStat {
  label: string
  value: string
}

export default function PropertyCard({
  imageUrl,
  name,
  location,
  stats,
  to,
  editOverlay,
}: {
  imageUrl?: string
  name: string
  location: string
  stats: PropertyCardStat[]
  to: string
  editOverlay?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="card prop-card" onClick={() => navigate(to)}>
      <div className="prop-img" style={imageUrl ? { backgroundImage: `url('${imageUrl}')` } : undefined}>
        {editOverlay}
      </div>
      <div className="prop-body">
        <div className="prop-name">
          {name} <span style={{ color: 'var(--orange)' }}>›</span>
        </div>
        <div className="prop-loc">{location}</div>
        <div className="prop-stats">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="plabel">{s.label}</div>
              {s.value}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
