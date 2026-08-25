import { useState } from 'react'
import {
  useDocumentCategories,
  useCreateDocumentCategory,
  useUpdateDocumentCategory,
  useDeleteDocumentCategory,
} from '../../../queries/documentCategories'
import { useToast } from '../../../components/Toast'
import Modal from '../../../components/Modal'
import DocTypePill from '../../../components/DocTypePill'
import type { DocumentCategory } from '../../../types/database.types'

const SWATCHES: { bg: string; text: string }[] = [
  { bg: '#e8effb', text: '#2b5aa0' },
  { bg: '#f0eafa', text: '#6b3fa0' },
  { bg: '#e6f5ea', text: '#1e7e40' },
  { bg: '#fde8e8', text: '#c0392b' },
  { bg: '#fdf1de', text: '#d97710' },
  { bg: '#f0f0f0', text: '#777777' },
]

export default function DocumentCategoriesAdminPage() {
  const categories = useDocumentCategories()
  const create = useCreateDocumentCategory()
  const update = useUpdateDocumentCategory()
  const remove = useDeleteDocumentCategory()
  const toast = useToast()

  const [modal, setModal] = useState<'add' | DocumentCategory | null>(null)
  const [form, setForm] = useState({ name: '', badge_bg: SWATCHES[0].bg, badge_text: SWATCHES[0].text })

  function openAdd() {
    setForm({ name: '', badge_bg: SWATCHES[0].bg, badge_text: SWATCHES[0].text })
    setModal('add')
  }
  function openEdit(cat: DocumentCategory) {
    setForm({ name: cat.name, badge_bg: cat.badge_bg, badge_text: cat.badge_text })
    setModal(cat)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (modal === 'add') {
        await create.mutateAsync(form)
      } else if (modal) {
        await update.mutateAsync({ id: modal.id, values: form })
      }
      setModal(null)
      toast.show('Category saved.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save category.', 'error')
    }
  }

  async function handleDelete(cat: DocumentCategory) {
    if (!confirm(`Delete "${cat.name}"? Documents using it will need a new category first.`)) return
    try {
      await remove.mutateAsync(cat.id)
      toast.show('Category deleted.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not delete — it may still be in use.', 'error')
    }
  }

  return (
    <>
      <div className="page-head-row">
        <div>
          <h1 className="page-title serif">Document Categories</h1>
          <div className="page-sub">Manage the type/filter options available when uploading documents.</div>
        </div>
        <button className="btn-solid" onClick={openAdd} type="button">
          + ADD CATEGORY
        </button>
      </div>

      <div className="card">
        {(categories.data ?? []).length === 0 && (
          <div className="empty-state">No categories yet. Add one before uploading documents.</div>
        )}
        {(categories.data ?? []).map((c) => (
          <div className="admin-table-row" style={{ gridTemplateColumns: '1fr auto auto', cursor: 'default' }} key={c.id}>
            <div>
              <DocTypePill category={c} />
            </div>
            <button className="btn-icon" onClick={() => openEdit(c)} type="button" aria-label="Edit">
              ✎
            </button>
            <button className="btn-icon" onClick={() => handleDelete(c)} type="button" aria-label="Delete">
              ✕
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal === 'add' ? 'Add Category' : 'Edit Category'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-outline" type="button" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn-solid" type="submit" form="category-form">
                Save
              </button>
            </>
          }
        >
          <form id="category-form" onSubmit={handleSave}>
            <label className="field-label">Name</label>
            <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="field-label">Colour</label>
            <div className="swatch-row">
              {SWATCHES.map((s) => (
                <button
                  key={s.bg}
                  type="button"
                  className={'swatch' + (form.badge_bg === s.bg ? ' selected' : '')}
                  style={{ background: s.bg, border: `1px solid ${s.text}` }}
                  onClick={() => setForm({ ...form, badge_bg: s.bg, badge_text: s.text })}
                  aria-label={s.bg}
                />
              ))}
            </div>
            <div style={{ marginTop: 4 }}>
              Preview: <DocTypePill category={{ ...form, id: '', sort_order: 0, created_at: '' }} />
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
