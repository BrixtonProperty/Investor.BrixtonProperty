import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProperty } from '../../../queries/properties'
import {
  usePropertyPhotos,
  useSignedPhotoUrls,
  useUploadPropertyPhoto,
  useReplacePropertyPhoto,
  useDeletePropertyPhoto,
  useCropAndSetCover,
} from '../../../queries/propertyPhotos'
import { useToast } from '../../../components/Toast'
import Breadcrumb from '../../../components/Breadcrumb'
import Modal from '../../../components/Modal'
import PhotoGrid, { type GridPhoto } from '../../../components/PhotoGrid'
import CoverPhotoCropper from '../../../components/CoverPhotoCropper'
import Icon from '../../../components/Icon'
import type { PropertyPhoto } from '../../../types/database.types'

export default function PhotosAdminPage() {
  const { id } = useParams<{ id: string }>()
  const property = useProperty(id)
  const photos = usePropertyPhotos(id)
  const signed = useSignedPhotoUrls((photos.data ?? []).map((p) => p.storage_path))
  const upload = useUploadPropertyPhoto()
  const replace = useReplacePropertyPhoto()
  const remove = useDeletePropertyPhoto()
  const cropAndSetCover = useCropAndSetCover()
  const toast = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploadingCount, setUploadingCount] = useState<{ done: number; total: number } | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<PropertyPhoto | null>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [coverTarget, setCoverTarget] = useState<PropertyPhoto | null>(null)

  if (property.isLoading || photos.isLoading) return <div className="loading-state">Loading photos…</div>
  if (!property.data || !id) return <div className="error-state">Property not found.</div>
  const p = property.data

  const sorted = [...(photos.data ?? [])].sort((a, b) => (a.taken_or_added_date < b.taken_or_added_date ? 1 : -1))
  const gridPhotos: GridPhoto[] = sorted.map((ph) => ({
    id: ph.id,
    url: signed.data?.[ph.storage_path] ?? '',
    title: ph.title || p.name,
    date: ph.taken_or_added_date,
    isCover: ph.is_cover,
  }))
  const photoById = new Map(sorted.map((ph) => [ph.id, ph]))

  function addFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setPendingFiles((prev) => [...prev, ...imageFiles])
  }

  function removePendingFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleUploadAll() {
    if (!id || pendingFiles.length === 0) return
    setUploadingCount({ done: 0, total: pendingFiles.length })
    const today = new Date().toISOString().slice(0, 10)
    let failures = 0
    for (const file of pendingFiles) {
      try {
        // No required title/caption -- falls back to the property name wherever displayed.
        await upload.mutateAsync({ propertyId: id, file, title: '', takenDate: today })
      } catch {
        failures++
      }
      setUploadingCount((c) => (c ? { done: c.done + 1, total: c.total } : c))
    }
    setUploadingCount(null)
    setPendingFiles([])
    setAddOpen(false)
    if (failures > 0) {
      toast.show(`${pendingFiles.length - failures} of ${pendingFiles.length} photos uploaded — ${failures} failed.`, 'error')
    } else {
      toast.show(`${pendingFiles.length} photo(s) added.`)
    }
  }

  function closeAdd() {
    setAddOpen(false)
    setPendingFiles([])
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

  function handleSetCoverClick(gridPhoto: GridPhoto) {
    const photo = photoById.get(gridPhoto.id)
    if (!photo) return
    setCoverTarget(photo)
  }

  async function handleCropSave(blob: Blob) {
    if (!id || !coverTarget) return
    try {
      await cropAndSetCover.mutateAsync({ propertyId: id, blob, title: coverTarget.title || p.name })
      setCoverTarget(null)
      toast.show('Cover photo set.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not set cover photo.', 'error')
    }
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
      <div className="page-sub">
        Add, replace, or remove photos for {p.name}. Click the star on any photo to set it as the cover shown on
        the grid card and detail hero.
      </div>

      <input ref={replaceInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReplaceFileChosen} />

      <PhotoGrid
        photos={gridPhotos}
        editable
        onAddClick={() => setAddOpen(true)}
        onEditTile={handleReplaceClick}
        onDeleteTile={handleDelete}
        onSetCover={handleSetCoverClick}
      />

      {addOpen && (
        <Modal
          title="Add Photos"
          onClose={closeAdd}
          footer={
            <>
              <button className="btn-outline" type="button" onClick={closeAdd}>
                Cancel
              </button>
              <button
                className="btn-solid"
                type="button"
                onClick={handleUploadAll}
                disabled={pendingFiles.length === 0 || !!uploadingCount}
              >
                {uploadingCount ? `Uploading ${uploadingCount.done}/${uploadingCount.total}…` : `Upload ${pendingFiles.length || ''} Photo(s)`}
              </button>
            </>
          }
        >
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
            }}
            style={{
              border: `2px dashed ${dragging ? 'var(--orange)' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '32px 20px',
              textAlign: 'center',
              color: dragging ? 'var(--orange)' : 'var(--text-faint)',
              marginBottom: 14,
              background: dragging ? 'var(--orange-soft)' : 'none',
            }}
          >
            <Icon name="upload" size={26} />
            <p style={{ margin: '10px 0 12px', fontSize: 13 }}>Drag and drop photos here, or</p>
            <label className="btn-outline" style={{ display: 'inline-block', cursor: 'pointer' }}>
              Choose Files
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
            <p style={{ margin: '10px 0 0', fontSize: 11 }}>No title required — files upload as-is.</p>
          </div>

          {pendingFiles.length > 0 && (
            <div>
              {pendingFiles.map((f, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13 }}
                >
                  <Icon name="image" size={16} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <button className="btn-icon" type="button" onClick={() => removePendingFile(i)} aria-label="Remove">
                    <Icon name="close" size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {coverTarget && signed.data?.[coverTarget.storage_path] && (
        <CoverPhotoCropper
          imageUrl={signed.data[coverTarget.storage_path]}
          onCancel={() => setCoverTarget(null)}
          onSave={handleCropSave}
          saving={cropAndSetCover.isPending}
        />
      )}
    </>
  )
}
