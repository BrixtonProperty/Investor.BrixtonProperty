export interface ParsedSchedule {
  columns: string[]
  rows: string[][]
  asAt: string | null
}

const MAX_ROWS = 500
const MAX_COLS = 30
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function toIso(y: number, m: number, d: number): string | null {
  const year = y < 100 ? 2000 + y : y
  if (m < 1 || m > 12 || d < 1 || d > 31 || year < 1990 || year > 2100) return null
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Pulls a date out of free text ("31 March 2026", "31.03.2026", "March 31, 2026"). Numeric dates are read day-first. */
export function parseLooseDate(text: string): string | null {
  let m = text.match(/(\d{1,2})(?:st|nd|rd|th)?[\s\-/.]+([A-Za-z]{3,9})[\s\-/.,]+(\d{2,4})/)
  if (m) {
    const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1
    if (month > 0) return toIso(Number(m[3]), month, Number(m[1]))
  }
  m = text.match(/([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/)
  if (m) {
    const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1
    if (month > 0) return toIso(Number(m[3]), month, Number(m[2]))
  }
  m = text.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) return toIso(Number(m[3]), Number(m[2]), Number(m[1]))
  return null
}

/** Reads the first sheet of an Excel/CSV file as the text Excel displays for each cell. */
export async function parseTenancyFile(file: File): Promise<ParsedSchedule> {
  const XLSX = await import('xlsx')
  let wb
  try {
    wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true, dateNF: 'dd mmm yyyy' })
  } catch {
    throw new Error("Couldn't read that file. Upload an Excel (.xlsx) file.")
  }
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error('That file has no sheets in it.')

  const grid = XLSX.utils
    .sheet_to_json<unknown[]>(ws, { header: 1, raw: false, blankrows: false, defval: '', dateNF: 'dd mmm yyyy' })
    .map((r) => r.map((c) => String(c ?? '').trim()))
    .filter((r) => r.some(Boolean))
  if (grid.length === 0) throw new Error('That sheet is empty.')

  const width = Math.max(...grid.map((r) => r.length))
  const usedCols = Array.from({ length: width }, (_, i) => i).filter((i) => grid.some((r) => r[i]))
  const trimmed = grid.map((r) => usedCols.map((i) => r[i] ?? ''))

  // Title lines above the table ("Tenancy Schedule", "As at 31 March 2026") only
  // fill a cell or two; the header is the first row with several filled cells.
  const minFilled = Math.min(3, usedCols.length)
  let headerIdx = trimmed.findIndex((r) => r.filter(Boolean).length >= minFilled)
  if (headerIdx < 0) headerIdx = 0

  let asAt: string | null = null
  for (const row of trimmed.slice(0, headerIdx)) {
    const hit = row.join(' ').match(/as\s*at[:\s-]*(.+)$/i)
    if (hit) {
      asAt = parseLooseDate(hit[1])
      if (asAt) break
    }
  }
  if (!asAt) asAt = parseLooseDate(file.name)

  const columns = trimmed[headerIdx]
  const rows = trimmed.slice(headerIdx + 1)
  if (rows.length === 0) throw new Error("Couldn't find any tenancy rows under the column headings.")
  if (columns.length > MAX_COLS || rows.length > MAX_ROWS) {
    throw new Error(`That sheet is too large (limit ${MAX_ROWS} rows by ${MAX_COLS} columns).`)
  }
  return { columns, rows, asAt }
}

export function isNumericCell(text: string): boolean {
  return /^[\s$€£(–-]*[\d,]+(\.\d+)?\s*%?\)?\s*$/.test(text)
}
