import { useMemo, useState } from 'react'
import { fmtMonthYear } from '../lib/format'
import Lightbox from './Lightbox'
import Icon from './Icon'

export interface GridPhoto {
  id: string
  url: string
  title: string
  date: string
  isNew?: boolean
  isCover?: boolean
}

export default function PhotoGrid({
  photos,
  editable,
  onEditTile,
  onDeleteTile,
  onSetCover,
  onAddClick,
}: {
  photos: GridPhoto[]
  editable?: boolean
  onEditTile?: (photo: GridPhoto) => void
  onDeleteTile?: (photo: GridPhoto) => void
  onSetCover?: (photo: GridPhoto) => void
  onAddClick?: () => void
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const groups = useMemo(() => {
    const byMonth = new Map<string, GridPhoto[]>()
    for (const p of photos) {
      const key = p.date.slice(0, 7) // YYYY-MM
      if (!byMonth.has(key)) byMonth.set(key, [])
      byMonth.get(key)!.push(p)
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, items]) => ({ label: fmtMonthYear(key + '-01'), items }))
  }, [photos])

  if (photos.length === 0 && !editable) {
    return <div className="empty-state">No photos published yet.</div>
  }

  return (
    <>
      {editable && (
        <div className="gallery-toolbar">
          <button className="btn-outline" onClick={onAddClick} type="button">
            + Add Photos
          </button>
        </div>
      )}
      {groups.map((g) => (
        <div key={g.label}>
          <div className="month-label">{g.label}</div>
          <div className="photo-grid-page">
            {g.items.map((p) => {
              const idx = photos.indexOf(p)
              return (
                <div
                  key={p.id}
                  className="photo-tile"
                  style={{ backgroundImage: `url('${p.url}')` }}
                  onClick={() => setLightboxIndex(idx)}
                >
                  {p.isNew && <span className="new-badge">NEW</span>}
                  {p.isCover && <span className="cover-badge">COVER PHOTO</span>}
                  <div className="cap">
                    {p.title}
                    <br />
                    {p.date}
                  </div>
                  {editable && (
                    <div className="tile-edit-overlay">
                      {onSetCover && !p.isCover && (
                        <button
                          type="button"
                          aria-label="Set as cover photo"
                          title="Set as cover photo"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSetCover(p)
                          }}
                        >
                          <Icon name="star" size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Replace photo"
                        title="Replace photo"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditTile?.(p)
                        }}
                      >
                        <Icon name="edit" size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete photo"
                        title="Delete photo"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteTile?.(p)
                        }}
                      >
                        <Icon name="close" size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {editable && photos.length === 0 && (
        <button className="add-photo-tile" onClick={onAddClick} type="button" style={{ width: '100%' }}>
          <Icon name="plus" size={22} />
          Add the first photos
        </button>
      )}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
