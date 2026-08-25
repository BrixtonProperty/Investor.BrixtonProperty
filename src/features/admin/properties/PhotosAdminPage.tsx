import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProperty } from '../../../queries/properties'
import {
  usePropertyPhotos,
  useSignedPhotoUrls,
  useUploadPropertyPhoto,
  useReplacePropertyPhoto,
  useDeletePropertyPhoto,
} from '../../../queries/propertyPhotos'
import { useToast } from '../../../components/Toast'
import Breadcrumb from '../../../components/Breadcrumb'
import Modal from '../../../components/Modal'
import PhotoGrid, { type GridPhoto } from '../../../components/PhotoGrid'
import type { PropertyPhoto } from '../../../types/database.types'

export default function PhotosAdminPage() {
  const { id } = useParams<{ id: string }>()
  const property = useProperty(id)
  const photos = usePropertyPhotos(id)
  const signed = useSignedPhotoUrls((photos.data ?? []).map((p) => p.storage_path))
  const upload = useUploadPropertyPhoto()
  const replace = useReplacePropertyPhoto()
  const remove = useDeletePropertyPhoto()
  const toast = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addFile, setAddFile] = useState<File | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<PropertyPhoto | null>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  if (property.isLoading || photos.isLoading) return <div className="loading-state">Loading photos…</div>
  if (!property.data || !id) return <div className="error-state">Property not found.</div>
  const p = property.data

  const sorted = [...(photos.data ?? [])].sort((a, b) => (a.taken_or_added_date < b.taken_or_added_date ? 1 : -1))
  const gridPhotos: GridPhoto[] = sorted.map((ph) => ({
    id: ph.id,
    url: signed.data?.[ph.storage_path] ?? '',
    title: ph.title || p.name,
    date: ph.taken_or_added_date,
  }))
  const photoById = new Map(sorted.map((ph) => [ph.id, ph]))

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addFile || !id) return
    try {
      await upload.mutateAsync({ propertyId: id, file: addFile, title: addTitle, takenDate: new Date().toISOString().slice(0, 10) })
      setAddOpen(false)
      setAddTitle('')
      setAddFile(null)
      toast.show('Photo added.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not upload photo.', 'error')
    }
  }

  function handleReplaceClick(gridPhoto: GridPhoto) {
    const photo = photoById.get(gridPhoto.id)
    if (!photo) return
    setReplaceTarget(photo)
    replaceInputRef.current?.click()
  }

  async function handleReplaceFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !replaceTarget) return
    try {
      await replace.mutateAsync({ photo: replaceTarget, file })
      toast.show('Photo replaced.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not replace photo.', 'error')
    } finally {
      setReplaceTarget(null)
    }
  }

  async function handleDelete(gridPhoto: GridPhoto) {
    const photo = photoById.get(gridPhoto.id)
    if (!photo) return
    if (!confirm('Delete this photo?')) return
    await remove.mutateAsync(photo)
    toast.show('Photo deleted.')
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Properties', to: '/admin/properties' },
          { label: p.name, to: `/admin/properties/${p.id}` },
          { label: 'Photos' },
        ]}
      />
      <div className="sub-eyebrow">{p.name}</div>
      <h1 className="page-title serif">Manage Photos</h1>
      <div className="page-sub">Add, replace, or remove photos for {p.name}.</div>

      <input ref={replaceInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReplaceFileChosen} />

      <PhotoGrid
        photos={gridPhotos}
        editable
        onAddClick={() => setAddOpen(true)}
        onEditTile={handleReplaceClick}
        onDeleteTile={handleDelete}
      />

      {addOpen && (
        <Modal
          title="Add Photo"
          onClose={() => setAddOpen(false)}
          footer={
            <>
              <button className="btn-outline" type="button" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button className="btn-solid" type="submit" form="add-photo-form" disabled={!addFile || upload.isPending}>
                {upload.isPending ? 'Uploading…' : 'Add Photo'}
              </button>
            </>
          }
        >
          <form id="add-photo-form" onSubmit={handleAdd}>
            <label className="field-label">Title / caption</label>
            <input className="form-input" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="e.g. Exterior, Dusk" />
            <label className="field-label">Photo file</label>
            <input
              className="form-input"
              type="file"
              accept="image/*"
              onChange={(e) => setAddFile(e.target.files?.[0] ?? null)}
              required
            />
          </form>
        </Modal>
      )}
    </>
  )
}
