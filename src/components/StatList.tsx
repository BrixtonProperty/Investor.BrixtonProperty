import type { ReactNode } from 'react'
import Icon from './Icon'

export interface StatRow {
  icon: ReactNode
  label: string
  value: ReactNode
  caption?: string
  onEdit?: () => void
}

export default function StatList({ rows }: { rows: StatRow[] }) {
  return (
    <div className="stat-list">
      {rows.map((row) => (
        <div className="row" key={row.label}>
          <span className="ic">{row.icon}</span>
          <div>
            <div className="slabel2">{row.label}</div>
            <div className="sval2">
              {row.value}
              {row.caption && (
                <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 400 }}>{row.caption}</div>
              )}
            </div>
          </div>
          {row.onEdit && (
            <button className="field-edit-btn row-edit" onClick={row.onEdit} type="button" aria-label={`Edit ${row.label}`}>
              <Icon name="edit" size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
