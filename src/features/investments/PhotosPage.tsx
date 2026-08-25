import { useParams } from 'react-router-dom'
import { useProperty } from '../../queries/properties'
import { usePropertyPhotos, useSignedPhotoUrls } from '../../queries/propertyPhotos'
import Breadcrumb from '../../components/Breadcrumb'
import PhotoGrid, { type GridPhoto } from '../../components/PhotoGrid'

export default function PhotosPage() {
  const { id } = useParams<{ id: string }>()
  const property = useProperty(id)
  const photos = usePropertyPhotos(id)
  const signed = useSignedPhotoUrls((photos.data ?? []).map((p) => p.storage_path))

  if (property.isLoading || photos.isLoading) return <div className="loading-state">Loading photos…</div>
  if (!property.data) return <div className="error-state">Property not found.</div>

  const p = property.data
  const sorted = [...(photos.data ?? [])].sort((a, b) => (a.taken_or_added_date < b.taken_or_added_date ? 1 : -1))
  const newestDate = sorted[0]?.taken_or_added_date

  const gridPhotos: GridPhoto[] = sorted.map((ph) => ({
    id: ph.id,
    url: signed.data?.[ph.storage_path] ?? '',
    title: ph.title || p.name,
    date: ph.taken_or_added_date,
    isNew: ph.id === sorted[0]?.id && ph.taken_or_added_date === newestDate,
  }))

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Investments', to: '/investments' },
          { label: p.name, to: `/investments/${p.id}` },
          { label: 'Photos' },
        ]}
      />
      <div className="sub-eyebrow">{p.name}</div>
      <h1 className="page-title serif">View Photos</h1>
      <div className="page-sub">Browse all photos of {p.name}. Most recent photos appear at the top.</div>
      <PhotoGrid photos={gridPhotos} />
    </>
  )
}
