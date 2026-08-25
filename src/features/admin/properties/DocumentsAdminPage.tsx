import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProperty } from '../../../queries/properties'
import { useDocuments, useUploadDocument, useUpdateDocument, useDeleteDocument } from '../../../queries/documents'
import { useDocumentCategories } from '../../../queries/documentCategories'
import { openDocument } from '../../../lib/signedUrl'
import { useToast } from '../../../components/Toast'
import Breadcrumb from '../../../components/Breadcrumb'
import Modal from '../../../components/Modal'
import DocTable from '../../../components/DocTable'
import type { DocumentRow } from '../../../types/database.types'

export default function DocumentsAdminPage() {
  const { id } = useParams<{ id: string }>()
  const property = useProperty(id)
  const documents = useDocuments(id)
  const categories = useDocumentCategories()
  const upload = useUploadDocument()
  const update = useUpdateDocument()
  const remove = useDeleteDocument()
  const toast = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', categoryId: '' })
  const [addFile, setAddFile] = useState<File | null>(null)
  const [editing, setEditing] = useState<DocumentRow | null>(null)
  const [editForm, setEditForm] = useState({ name: '', categoryId: '' })

  if (property.isLoading) return <div className="loading-state">Loading documents…</div>
  if (!property.data || !id) return <div className="error-state">Property not found.</div>
  const p = property.data
  const cats = categories.data ?? []

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addFile || !addForm.categoryId || !id) return
    try {
      await upload.mutateAsync({ propertyId: id, categoryId: addForm.categoryId, file: addFile, name: addForm.name || addFile.name })
      setAddOpen(false)
      setAddForm({ name: '', categoryId: '' })
      setAddFile(null)
      toast.show('Document added.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not upload document.', 'error')
    }
  }

  function openEdit(doc: DocumentRow) {
    setEditForm({ name: doc.name, categoryId: doc.category_id })
    setEditing(doc)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    try {
      await update.mutateAsync({ id: editing.id, values: { name: editForm.name, category_id: editForm.categoryId } })
      setEditing(null)
      toast.show('Document updated.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save.', 'error')
    }
  }

  async function handleDelete(doc: DocumentRow) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    await remove.mutateAsync(doc)
    toast.show('Document deleted.')
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Properties', to: '/admin/properties' },
          { label: p.name, to: `/admin/properties/${p.id}` },
          { label: 'Documents' },
        ]}
      />
      <div className="sub-eyebrow">{p.name}</div>
      <h1 className="page-title serif">Manage Documents</h1>
      <div className="page-sub">Add, edit, or remove documents for {p.name}.</div>

      {cats.length === 0 && (
        <div className="empty-state" style={{ marginBottom: 16 }}>
          No document categories yet — create one under Document Categories before uploading.
        </div>
      )}

      <DocTable
        documents={documents.data ?? []}
        categories={cats}
        onOpen={(d) => openDocument(d.storage_path).catch(() => {})}
        editable
        onAdd={() => setAddOpen(true)}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {addOpen && (
        <Modal
          title="Add Document"
          onClose={() => setAddOpen(false)}
          footer={
            <>
              <button className="btn-outline" type="button" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button className="btn-solid" type="submit" form="add-doc-form" disabled={!addFile || !addForm.categoryId || upload.isPending}>
                {upload.isPending ? 'Uploading…' : 'Add Document'}
              </button>
            </>
          }
        >
          <form id="add-doc-form" onSubmit={handleAdd}>
            <label className="field-label">Document name</label>
            <input className="form-input" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Defaults to file name" />
            <label className="field-label">Category</label>
            <select className="form-select" required value={addForm.categoryId} onChange={(e) => setAddForm({ ...addForm, categoryId: e.target.value })}>
              <option value="">Select a category…</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="field-label">File</label>
            <input className="form-input" type="file" required onChange={(e) => setAddFile(e.target.files?.[0] ?? null)} />
          </form>
        </Modal>
      )}

      {editing && (
        <Modal
          title="Edit Document"
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn-outline" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn-solid" type="submit" form="edit-doc-form">
                Save
              </button>
            </>
          }
        >
          <form id="edit-doc-form" onSubmit={handleSaveEdit}>
            <label className="field-label">Document name</label>
            <input className="form-input" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <label className="field-label">Category</label>
            <select className="form-select" required value={editForm.categoryId} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </form>
        </Modal>
      )}
    </>
  )
}
