import { useEffect } from 'react'
import { fmtDate } from '../lib/format'

export interface LightboxPhoto {
  id: string
  url: string
  title: string
  date: string
}

export default function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: LightboxPhoto[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const cur = photos[index]

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onIndexChange((index - 1 + photos.length) % photos.length)
      else if (e.key === 'ArrowRight') onIndexChange((index + 1) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, photos.length, onIndexChange, onClose])

  if (!cur) return null

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-top">
        <span>
          {index + 1} / {photos.length}
        </span>
        <button className="lightbox-close" onClick={onClose} type="button" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="lightbox-main" onClick={(e) => e.stopPropagation()}>
        <button
          className="lightbox-arrow left"
          onClick={() => onIndexChange((index - 1 + photos.length) % photos.length)}
          type="button"
          aria-label="Previous"
        >
          ‹
        </button>
        <div
          className="lightbox-img"
          style={{ backgroundImage: `url('${cur.url}')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat' }}
        />
        <button
          className="lightbox-arrow right"
          onClick={() => onIndexChange((index + 1) % photos.length)}
          type="button"
          aria-label="Next"
        >
          ›
        </button>
      </div>
      <div className="lightbox-cap" onClick={(e) => e.stopPropagation()}>
        <div className="lt">{cur.title}</div>
        <div className="ld">{fmtDate(cur.date)}</div>
      </div>
      <div className="lightbox-thumbs" onClick={(e) => e.stopPropagation()}>
        {photos.map((p, i) => (
          <div
            key={p.id}
            className={i === index ? 'active' : ''}
            style={{ backgroundImage: `url('${p.url}')` }}
            onClick={() => onIndexChange(i)}
          />
        ))}
      </div>
    </div>
  )
}
