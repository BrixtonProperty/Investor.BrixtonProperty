import { useRef, useState } from 'react'
import Modal from './Modal'

interface Props {
  title: string
  imageUrl: string
  /** width:height, e.g. 16/9, 1, 3/4 */
  aspectRatio: number
  frameWidth?: number
  helpText?: string
  onCancel: () => void
  onSave: (blob: Blob) => void
  saving?: boolean
}

/** Fixed-ratio crop tool: the frame shape never changes, admin can only zoom
 * and pan the photo within it (standard profile-picture-style cropper). */
export default function ImageCropper({
  title,
  imageUrl,
  aspectRatio,
  frameWidth = 440,
  helpText,
  onCancel,
  onSave,
  saving,
}: Props) {
  const frameW = frameWidth
  const frameH = Math.round(frameWidth / aspectRatio)
  const outputW = 1600
  const outputH = Math.round(outputW / aspectRatio)

  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 }) // px, relative to frame center
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
  }

  // Base scale: smallest scale where the image still fully covers the frame ("cover" behaviour).
  function baseScale() {
    if (!naturalSize) return 1
    return Math.max(frameW / naturalSize.w, frameH / naturalSize.h)
  }

  function clampOffset(x: number, y: number, currentZoom: number) {
    if (!naturalSize) return { x, y }
    const scale = baseScale() * currentZoom
    const renderedW = naturalSize.w * scale
    const renderedH = naturalSize.h * scale
    const maxX = Math.max(0, (renderedW - frameW) / 2)
    const maxY = Math.max(0, (renderedH - frameH) / 2)
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) }
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y }
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset(clampOffset(dragRef.current.origX + dx, dragRef.current.origY + dy, zoom))
  }
  function handlePointerUp() {
    dragRef.current = null
  }

  function handleZoomChange(next: number) {
    setZoom(next)
    setOffset((o) => clampOffset(o.x, o.y, next))
  }

  async function handleSave() {
    if (!naturalSize) return
    const canvas = document.createElement('canvas')
    canvas.width = outputW
    canvas.height = outputH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    const outputScale = outputW / frameW
    const scale = baseScale() * zoom * outputScale
    const renderedW = naturalSize.w * scale
    const renderedH = naturalSize.h * scale
    const dx = outputW / 2 - renderedW / 2 + offset.x * outputScale
    const dy = outputH / 2 - renderedH / 2 + offset.y * outputScale

    ctx.drawImage(img, dx, dy, renderedW, renderedH)
    canvas.toBlob(
      (blob) => {
        if (blob) onSave(blob)
      },
      'image/jpeg',
      0.92,
    )
  }

  const scale = baseScale() * zoom
  const renderedW = naturalSize ? naturalSize.w * scale : 0
  const renderedH = naturalSize ? naturalSize.h * scale : 0

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn-outline" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-solid" type="button" onClick={handleSave} disabled={!naturalSize || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <p className="form-note" style={{ marginTop: 0 }}>
        {helpText ?? 'Drag to reposition, use the slider to zoom. The frame shape is fixed to match where this image displays.'}
      </p>
      <div
        style={{
          width: frameW,
          height: frameH,
          margin: '0 auto 16px',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: 8,
          background: '#111',
          cursor: dragRef.current ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          src={imageUrl}
          onLoad={onImgLoad}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            left: frameW / 2 - renderedW / 2 + offset.x,
            top: frameH / 2 - renderedH / 2 + offset.y,
            width: renderedW || undefined,
            height: renderedH || undefined,
            maxWidth: 'none',
            userSelect: 'none',
          }}
        />
      </div>
      <label className="field-label">Zoom</label>
      <input
        type="range"
        min={1}
        max={3}
        step={0.01}
        value={zoom}
        onChange={(e) => handleZoomChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </Modal>
  )
}
