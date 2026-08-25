import { useMemo, useState } from 'react'
import { fmtBytes, fmtDate } from '../lib/format'
import DocTypePill from './DocTypePill'
import Pagination from './Pagination'
import type { DocumentCategory, DocumentRow } from '../types/database.types'

const PAGE_SIZE = 8

export default function DocTable({
  documents,
  categories,
  onOpen,
  editable,
  onAdd,
  onEdit,
  onDelete,
}: {
  documents: DocumentRow[]
  categories: DocumentCategory[]
  onOpen: (doc: DocumentRow) => void
  editable?: boolean
  onAdd?: () => void
  onEdit?: (doc: DocumentRow) => void
  onDelete?: (doc: DocumentRow) => void
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    let list = documents
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((d) => d.name.toLowerCase().includes(q))
    }
    if (filter !== 'all') {
      list = list.filter((d) => d.category_id === filter)
    }
    return list
  }, [documents, search, filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function isSpreadsheet(doc: DocumentRow) {
    return doc.mime_type?.includes('sheet') || doc.mime_type?.includes('excel') || doc.name.match(/\.xlsx?$/i)
  }

  return (
    <>
      <div className="doc-toolbar">
        <div className="doc-search">
          🔍
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <select
          className="doc-filter"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">Filter by type</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {editable && (
          <button className="btn-outline" onClick={onAdd} type="button">
            + Add Document
          </button>
        )}
      </div>

      <div className="card">
        <div className={editable ? 'doc-table-head admin-row' : 'doc-table-head'}>
          <div>Document Name</div>
          <div>Type</div>
          <div>Date Added</div>
          <div>Size</div>
          <div></div>
        </div>
        {pageItems.length === 0 && <div className="empty-state">No documents match.</div>}
        {pageItems.map((d) => (
          <div
            key={d.id}
            className={editable ? 'doc-table-row admin-row' : 'doc-table-row'}
            onClick={() => onOpen(d)}
          >
            <div className="doc-name-cell">
              <div className={`doc-ic ${isSpreadsheet(d) ? 'xls' : 'pdf'}`}>{isSpreadsheet(d) ? 'X' : 'P'}</div>
              {d.name}
            </div>
            <div>
              <DocTypePill category={categoryById.get(d.category_id)} />
            </div>
            <div className="doc-date-cell">{fmtDate(d.date_added)}</div>
            <div className="doc-size-cell">{fmtBytes(d.file_size_bytes)}</div>
            {editable ? (
              <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <button className="btn-icon" onClick={() => onEdit?.(d)} type="button" aria-label="Edit">
                  ✎
                </button>
                <button className="btn-icon" onClick={() => onDelete?.(d)} type="button" aria-label="Delete">
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ color: 'var(--orange)' }}>›</div>
            )}
          </div>
        ))}
      </div>

      <Pagination
        page={page}
        pageCount={pageCount}
        totalLabel={`Showing ${pageItems.length} of ${filtered.length} documents`}
        onChange={setPage}
      />
    </>
  )
}
