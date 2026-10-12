import type { ReactNode } from 'react'
import { fmtDate } from '../lib/format'
import { isNumericCell } from '../lib/tenancySchedule'
import type { PropertyTenancySchedule } from '../types/database.types'

export function TenancyTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  const numericCol = columns.map((_, c) => {
    const filled = rows.map((r) => r[c] ?? '').filter(Boolean)
    return filled.length > 0 && filled.every(isNumericCell)
  })
  return (
    <div className="tenancy-scroll">
      <table className="tenancy-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={numericCol[i] ? 'num' : undefined}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className={/^total/i.test(r.find(Boolean) ?? '') ? 'total' : undefined}>
              {columns.map((_, ci) => (
                <td key={ci} className={[numericCol[ci] ? 'num' : '', (r[ci] ?? '').length > 28 ? 'wrap' : ''].join(' ').trim() || undefined}>
                  {r[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Tenancy schedule card shown on every property detail page. `actions` is the
 * admin-only upload/remove controls; investors get the read-only table. */
export default function TenancyScheduleCard({
  schedule,
  loading,
  actions,
  emptyText,
}: {
  schedule: PropertyTenancySchedule | null | undefined
  loading?: boolean
  actions?: ReactNode
  emptyText?: string
}) {
  return (
    <div className="card area-schedule">
      <div className="section-label">
        TENANCY SCHEDULE
        {actions && <span style={{ display: 'flex', gap: 6 }}>{actions}</span>}
      </div>
      {loading && <div className="tenancy-note">Loading…</div>}
      {!loading && !schedule && <div className="tenancy-note">{emptyText ?? 'No tenancy schedule published yet.'}</div>}
      {schedule && (
        <>
          <div className="tenancy-asat">As at {fmtDate(schedule.as_at)}</div>
          <TenancyTable columns={schedule.columns} rows={schedule.rows} />
        </>
      )}
    </div>
  )
}
