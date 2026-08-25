import type { DocumentCategory } from '../types/database.types'

export default function DocTypePill({ category }: { category: DocumentCategory | undefined }) {
  if (!category) return <span className="doc-type-pill">—</span>
  return (
    <span
      className="doc-type-pill"
      style={{ background: category.badge_bg, color: category.badge_text }}
    >
      {category.name}
    </span>
  )
}
