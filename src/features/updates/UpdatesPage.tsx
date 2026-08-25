import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProperties } from '../../queries/properties'
import { useInvestorHoldings } from '../../queries/investorHoldings'
import { usePropertyThumbnails } from '../../queries/propertyPhotos'
import { useAllVisibleNotices } from '../../queries/notices'
import { useAllVisibleDocuments } from '../../queries/documents'
import { fmtCurrency, fmtDate, fmtPct } from '../../lib/format'
import Tabs from '../../components/Tabs'

type UpdTab = 'communications' | 'reports'

export default function UpdatesPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<UpdTab>('communications')
  const properties = useProperties()
  const holdings = useInvestorHoldings()
  const notices = useAllVisibleNotices()
  const documents = useAllVisibleDocuments()
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
        const items =
          tab === 'communications'
            ? (notices.data ?? []).filter((n) => n.property_id === p.id).slice(0, 3).map((n) => ({ id: n.id, title: n.title, date: n.notice_date }))
            : (documents.data ?? []).filter((d) => d.property_id === p.id).slice(0, 3).map((d) => ({ id: d.id, title: d.name, date: d.date_added }))

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
              <Tabs
                items={[
                  { id: 'communications', label: 'Communications' },
                  { id: 'reports', label: 'Reports' },
                ]}
                active={tab}
                onChange={(id) => setTab(id as UpdTab)}
                trailing={
                  <span
                    className="view-all"
                    style={{ marginLeft: 'auto', alignSelf: 'center', cursor: 'pointer' }}
                    onClick={() => navigate(`/investments/${p.id}/documents`)}
                  >
                    View all →
                  </span>
                }
              />
              {items.length === 0 && <div className="empty-note">Nothing published yet.</div>}
              {items.map((item) => (
                <div
                  className="upd-row"
                  key={item.id}
                  onClick={() => navigate(`/investments/${p.id}/documents`)}
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
