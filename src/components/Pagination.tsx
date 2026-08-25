export default function Pagination({
  page,
  pageCount,
  totalLabel,
  onChange,
}: {
  page: number
  pageCount: number
  totalLabel: string
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) {
    return (
      <div className="doc-pagination">
        <span>{totalLabel}</span>
      </div>
    )
  }
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)
  return (
    <div className="doc-pagination">
      <span>{totalLabel}</span>
      <div className="doc-pages">
        <button className="doc-nav-arrow" disabled={page <= 1} onClick={() => onChange(page - 1)} type="button">
          ‹ Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={'doc-page-num' + (p === page ? ' active' : '')}
            onClick={() => onChange(p)}
            type="button"
          >
            {p}
          </button>
        ))}
        <button
          className="doc-nav-arrow"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          type="button"
        >
          Next ›
        </button>
      </div>
    </div>
  )
}
