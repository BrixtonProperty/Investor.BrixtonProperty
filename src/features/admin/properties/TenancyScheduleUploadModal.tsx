import { useState } from 'react'
import { useSaveTenancySchedule } from '../../../queries/tenancySchedules'
import { parseTenancyFile, type ParsedSchedule } from '../../../lib/tenancySchedule'
import { useToast } from '../../../components/Toast'
import Modal from '../../../components/Modal'
import { TenancyTable } from '../../../components/TenancyScheduleCard'

const PREVIEW_ROWS = 8

export default function TenancyScheduleUploadModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const save = useSaveTenancySchedule()
  const toast = useToast()
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedSchedule | null>(null)
  const [asAt, setAsAt] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setParsed(null)
    setFileName(file.name)
    setReading(true)
    try {
      const result = await parseTenancyFile(file)
      setParsed(result)
      if (result.asAt) setAsAt(result.asAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that file.")
    } finally {
      setReading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!parsed) return
    try {
      await save.mutateAsync({
        property_id: propertyId,
        as_at: asAt,
        file_name: fileName,
        columns: parsed.columns,
        rows: parsed.rows,
      })
      toast.show('Tenancy schedule saved.')
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save the tenancy schedule.', 'error')
    }
  }

  return (
    <Modal
      wide
      title="Upload Tenancy Schedule"
      onClose={onClose}
      footer={
        <>
          <button className="btn-outline" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-solid" type="submit" form="tenancy-upload-form" disabled={!parsed || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Schedule'}
          </button>
        </>
      }
    >
      <form id="tenancy-upload-form" onSubmit={handleSave}>
        <label className="field-label">Excel file</label>
        <label className="btn-outline" style={{ display: 'inline-block', cursor: 'pointer' }}>
          {fileName ? 'Choose a different file' : 'Choose Excel File'}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        {fileName && <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-dim)' }}>{fileName}</span>}
        {reading && <div className="tenancy-note">Reading file…</div>}
        {error && (
          <div className="login-error" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}
        {parsed && (
          <>
            <label className="field-label" htmlFor="tenancy-as-at" style={{ marginTop: 18 }}>
              As at
            </label>
            <input
              id="tenancy-as-at"
              className="form-input"
              type="date"
              required
              value={asAt}
              onChange={(e) => setAsAt(e.target.value)}
            />
            <div style={{ fontSize: 12, color: 'var(--text-faint)', margin: '14px 0 4px' }}>
              Preview — {parsed.rows.length} row(s), {parsed.columns.length} column(s)
              {parsed.rows.length > PREVIEW_ROWS ? `, showing the first ${PREVIEW_ROWS}` : ''}
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px' }}>
              <TenancyTable columns={parsed.columns} rows={parsed.rows.slice(0, PREVIEW_ROWS)} />
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
