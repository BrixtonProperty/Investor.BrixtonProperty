export function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en-NZ')
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtMonthYear(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

/** "9" -> "9 (years)"; anything not a bare number (e.g. "15 Years", free text
 * from before this convention) is shown as entered rather than mangled. */
export function fmtLeaseTerm(term: string | null): string {
  if (!term) return '—'
  const trimmed = term.trim()
  return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed} (years)` : trimmed
}

export function fmtBytes(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let val = bytes / 1024
  let i = 0
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024
    i++
  }
  return `${val.toFixed(val < 10 ? 1 : 0)} ${units[i]}`
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}
