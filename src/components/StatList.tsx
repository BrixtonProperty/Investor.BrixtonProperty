import type { ReactNode } from 'react'
import Icon from './Icon'

export interface StatRow {
  icon: ReactNode
  label: string
  value: ReactNode
  caption?: string
  onEdit?: () => void
}

/** `columns={2}` lays rows out left-to-right, row by row, so rows[0] and rows[1]
 * share the top line, rows[2] and rows[3] the next, and so on. */
export default function StatList({ rows, columns = 1 }: { rows: StatRow[]; columns?: 1 | 2 }) {
  return (
    <div className={'stat-list' + (columns === 2 ? ' cols-2' : '')}>
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
