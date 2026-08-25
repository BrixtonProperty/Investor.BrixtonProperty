import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthProvider'
import { useProperties } from '../../../queries/properties'
import { usePropertyThumbnails } from '../../../queries/propertyPhotos'
import { useAllVisibleNotices } from '../../../queries/notices'
import { fmtCurrency, fmtDate } from '../../../lib/format'

/** Admin's unscoped equivalent of the investor Dashboard -- totals across every
 * property in the system, since an admin has no personal holdings of their own. */
export default function PortfolioDashboardPage() {
  const { investorUser } = useAuth()
  const navigate = useNavigate()
  const properties = useProperties()
  const notices = useAllVisibleNotices()
  const propertyIds = useMemo(() => properties.data?.map((p) => p.id) ?? [], [properties.data])
  const { thumbnails } = usePropertyThumbnails(propertyIds)

  const summary = useMemo(() => {
    const rows = properties.data ?? []
    return {
      totalProperties: rows.length,
      totalInitialInvestment: rows.reduce((sum, r) => sum + (r.initial_investment_amount ?? 0), 0),
      totalValue: rows.reduce((sum, r) => sum + r.total_value, 0),
      asAt: rows.reduce<string | null>((latest, r) => (!latest || r.valuation_date > latest ? r.valuation_date : latest), null),
    }
  }, [properties.data])

  const heroUrl = properties.data?.[0] ? thumbnails.get(properties.data[0].id) : undefined
  const recentNotices = (notices.data ?? []).slice(0, 2)
  const propertyById = new Map((properties.data ?? []).map((p) => [p.id, p]))

  if (properties.isLoading) return <div className="loading-state">Loading portfolio…</div>

  return (
    <>
      <h1 className="page-title serif">Portfolio</h1>
      <div className="dash-top">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            Welcome back, {investorUser?.name?.split(' ')[0] ?? ''}.
          </div>
          <div className="page-sub" style={{ marginBottom: 0 }}>
            An overview of every property Brixton manages.
          </div>
        </div>
        <div className="dash-hero" style={heroUrl ? { backgroundImage: `url('${heroUrl}')` } : undefined} />
      </div>

      <div className="card stat-panel">
        <div className="stat-panel-title">Portfolio Summary</div>
        <div className="stat-row3">
          <div className="stat-item">
            <div className="ic-circle">🏢</div>
            <div>
              <div className="slabel">Total Properties</div>
              <div className="sval">{summary.totalProperties}</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="ic-circle">⏱</div>
            <div>
              <div className="slabel">Total Initial Investment</div>
              <div className="sval">{fmtCurrency(summary.totalInitialInvestment)}</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="ic-circle">📈</div>
            <div>
              <div className="slabel">Total Latest Valuation</div>
              <div className="sval">{fmtCurrency(summary.totalValue)}</div>
              <div className="scap">as at {fmtDate(summary.asAt)}</div>
            </div>
          </div>
          <button className="btn-outline" style={{ marginLeft: 'auto' }} onClick={() => navigate('/admin/portfolio/investments')}>
            VIEW ALL INVESTMENTS
          </button>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="panel-head">
            <h4>All Properties</h4>
            <button className="view-all" onClick={() => navigate('/admin/portfolio/investments')} type="button">
              VIEW ALL →
            </button>
          </div>
          {(properties.data ?? []).length === 0 && <div className="empty-note">No properties yet.</div>}
          {(properties.data ?? []).slice(0, 6).map((p) => (
            <div className="inv-row-d" key={p.id} onClick={() => navigate(`/admin/portfolio/investments/${p.id}`)}>
              <div className="thumb-d" style={thumbnails.get(p.id) ? { backgroundImage: `url('${thumbnails.get(p.id)}')` } : undefined} />
              <div>
                <div className="inv-name-d">{p.name}</div>
                <div className="inv-loc-d">{p.location}</div>
              </div>
              <div className="inv-asset-d">
                <div className="av">{fmtCurrency(p.total_value)}</div>
                <div className="ad">
                  Latest Valuation
                  <br />
                  as at {fmtDate(p.valuation_date)}
                </div>
              </div>
              <div style={{ color: 'var(--text-faint)' }}>›</div>
            </div>
          ))}
        </div>

        <div>
          <div className="card">
            <div className="panel-head">
              <h4>Recent Updates</h4>
              <button className="view-all" onClick={() => navigate('/admin/portfolio/updates')} type="button">
                VIEW ALL →
              </button>
            </div>
            {recentNotices.length === 0 && <div className="empty-note">No updates published yet.</div>}
            {recentNotices.map((n) => (
              <div className="update-card-sm" key={n.id}>
                <div
                  className="thumb-sq"
                  style={thumbnails.get(n.property_id) ? { backgroundImage: `url('${thumbnails.get(n.property_id)}')` } : undefined}
                />
                <div>
                  <span className="tag-pill">{propertyById.get(n.property_id)?.name ?? 'UPDATE'}</span>
                  <div className="ut">{n.title}</div>
                  <div className="ud">{n.description}</div>
                  <div className="udate">{fmtDate(n.notice_date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
