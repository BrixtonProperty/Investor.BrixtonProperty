import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProperties } from '../../queries/properties'
import { useInvestorHoldings } from '../../queries/investorHoldings'
import { usePropertyThumbnails } from '../../queries/propertyPhotos'
import { useMergedUpdates } from '../../queries/updatesFeed'
import { fmtCurrency, fmtDate, fmtPct } from '../../lib/format'
import { openDocument } from '../../lib/signedUrl'

export default function UpdatesPage() {
  const navigate = useNavigate()
  const properties = useProperties()
  const holdings = useInvestorHoldings()
  const updates = useMergedUpdates()
  const propertyIds = useMemo(() => properties.data?.map((p) => p.id) ?? [], [properties.data])
  const { thumbnails } = usePropertyThumbnails(propertyIds)

  const holdingByProperty = useMemo(
    () => new Map((holdings.data ?? []).map((h) => [h.property_id, h])),
    [holdings.data],
  )

  if (properties.isLoading) return <div className="loading-state">Loading updates…</div>

  return (
    <>
      <h1 className="page-title serif">Investor Updates</h1>
      <div className="page-sub">
        Stay informed with the latest communications, reports and announcements for each investment.
      </div>

      {(properties.data ?? []).length === 0 && <div className="empty-state">Nothing published yet.</div>}

      {(properties.data ?? []).map((p) => {
        const h = holdingByProperty.get(p.id)
        const items = updates.items.filter((u) => u.property_id === p.id).slice(0, 3)

        return (
          <div className="card upd-property" key={p.id}>
            <div className="upd-thumb" style={thumbnails.get(p.id) ? { backgroundImage: `url('${thumbnails.get(p.id)}')` } : undefined} />
            <div className="upd-info">
              <h3 className="serif">{p.name}</h3>
              <div className="loc">{p.location}</div>
              <div className="ustat">Latest Valuation</div>
              <div className="uval">{fmtCurrency(p.total_value)}</div>
              <div className="ustat">Ownership</div>
              <div className="uval">{h ? fmtPct(h.ownership_pct) : '—'}</div>
            </div>
            <div className="upd-comms">
              <div className="panel-head" style={{ padding: '12px 20px 0' }}>
                <h4 style={{ fontSize: 13 }}>Communications &amp; Reports</h4>
                <span
                  className="view-all"
                  onClick={() => navigate(`/investments/${p.id}/documents`)}
                >
                  View all →
                </span>
              </div>
              {items.length === 0 && <div className="empty-note">Nothing published yet.</div>}
              {items.map((item) => (
                <div
                  className="upd-row"
                  key={item.id}
                  onClick={() => {
                    if (item.kind === 'document' && item.storage_path) {
                      openDocument(item.storage_path).catch(() => {})
                    } else {
                      navigate(`/investments/${p.id}`)
                    }
                  }}
                >
                  <div className="thumb-sm" style={thumbnails.get(p.id) ? { backgroundImage: `url('${thumbnails.get(p.id)}')` } : undefined} />
                  <div className="ut2">{item.title}</div>
                  <div className="ud2">{fmtDate(item.date)}</div>
                  <span style={{ color: 'var(--orange)' }}>›</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
