import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { useProperties } from '../../queries/properties'
import { useInvestorHoldings } from '../../queries/investorHoldings'
import { usePropertyThumbnails } from '../../queries/propertyPhotos'
import { useAllVisibleNotices } from '../../queries/notices'
import { fmtCurrency, fmtDate, fmtPct } from '../../lib/format'

export default function DashboardPage() {
  const { investorUser } = useAuth()
  const navigate = useNavigate()
  const properties = useProperties()
  const holdings = useInvestorHoldings()
  const notices = useAllVisibleNotices()
  const propertyIds = useMemo(() => properties.data?.map((p) => p.id) ?? [], [properties.data])
  const { thumbnails } = usePropertyThumbnails(propertyIds)

  const propertyById = useMemo(
    () => new Map((properties.data ?? []).map((p) => [p.id, p])),
    [properties.data],
  )

  const summary = useMemo(() => {
    const rows = holdings.data ?? []
    return {
      totalInvestments: rows.length,
      totalInvested: rows.reduce((sum, r) => sum + r.invested_amount, 0),
      totalAssetValue: rows.reduce((sum, r) => sum + r.current_asset_value, 0),
      asAt: rows.reduce<string | null>((latest, r) => (!latest || r.valuation_date > latest ? r.valuation_date : latest), null),
    }
  }, [holdings.data])

  const heroUrl = properties.data?.[0] ? thumbnails.get(properties.data[0].id) : undefined
  const recentNotices = (notices.data ?? []).slice(0, 2)

  if (properties.isLoading || holdings.isLoading) {
    return <div className="loading-state">Loading your dashboard…</div>
  }

  return (
    <>
      <h1 className="page-title serif">Dashboard</h1>
      <div className="dash-top">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            Welcome back, {investorUser?.name?.split(' ')[0] ?? ''}.
          </div>
          <div className="page-sub" style={{ marginBottom: 0 }}>
            Here's an overview of your investments.
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
              <div className="slabel">Total Investments</div>
              <div className="sval">{summary.totalInvestments}</div>
              <div className="scap">properties</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="ic-circle">⏱</div>
            <div>
              <div className="slabel">Total Invested</div>
              <div className="sval">{fmtCurrency(summary.totalInvested)}</div>
              <div className="scap">across all properties</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="ic-circle">📈</div>
            <div>
              <div className="slabel">Total Asset Value</div>
              <div className="sval">{fmtCurrency(summary.totalAssetValue)}</div>
              <div className="scap">as at {fmtDate(summary.asAt)}</div>
            </div>
          </div>
          <button className="btn-outline" style={{ marginLeft: 'auto' }} onClick={() => navigate('/investments')}>
            VIEW ALL INVESTMENTS
          </button>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="panel-head">
            <h4>Your Investments</h4>
            <button className="view-all" onClick={() => navigate('/investments')} type="button">
              VIEW ALL →
            </button>
          </div>
          {(holdings.data ?? []).length === 0 && <div className="empty-note">No investments yet.</div>}
          {(holdings.data ?? []).map((h) => {
            const p = propertyById.get(h.property_id)
            if (!p) return null
            return (
              <div className="inv-row-d" key={h.investor_property_id} onClick={() => navigate(`/investments/${p.id}`)}>
                <div
                  className="thumb-d"
                  style={thumbnails.get(p.id) ? { backgroundImage: `url('${thumbnails.get(p.id)}')` } : undefined}
                />
                <div>
                  <div className="inv-name-d">{p.name}</div>
                  <div className="inv-loc-d">{p.location}</div>
                  <div className="inv-meta-d">
                    <div>
                      <span>Ownership</span>
                      <b>{fmtPct(h.ownership_pct)}</b>
                    </div>
                    <div>
                      <span>Invested</span>
                      <b>{fmtCurrency(h.invested_amount)}</b>
                    </div>
                  </div>
                </div>
                <div className="inv-asset-d">
                  <div className="av">{fmtCurrency(h.current_asset_value)}</div>
                  <div className="ad">
                    Asset Value
                    <br />
                    as at {fmtDate(h.valuation_date)}
                  </div>
                </div>
                <div style={{ color: 'var(--text-faint)' }}>›</div>
              </div>
            )
          })}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="panel-head">
              <h4>Latest Investor Update</h4>
              <button className="view-all" onClick={() => navigate('/updates')} type="button">
                VIEW ALL →
              </button>
            </div>
            {recentNotices[0] ? (
              <div className="update-card-sm">
                <div
                  className="thumb-sq"
                  style={
                    thumbnails.get(recentNotices[0].property_id)
                      ? { backgroundImage: `url('${thumbnails.get(recentNotices[0].property_id)}')` }
                      : undefined
                  }
                />
                <div>
                  <span className="tag-pill">{propertyById.get(recentNotices[0].property_id)?.name ?? 'UPDATE'}</span>
                  <div className="ut">{recentNotices[0].title}</div>
                  <div className="ud">{recentNotices[0].description}</div>
                  <div className="udate">{fmtDate(recentNotices[0].notice_date)}</div>
                </div>
              </div>
            ) : (
              <div className="empty-note">No updates published yet.</div>
            )}
          </div>
          <div className="card">
            <div className="panel-head">
              <h4>Recent Notices</h4>
              <button className="view-all" onClick={() => navigate('/updates')} type="button">
                VIEW ALL →
              </button>
            </div>
            {recentNotices[1] ? (
              <div className="update-card-sm">
                <div
                  className="thumb-sq"
                  style={
                    thumbnails.get(recentNotices[1].property_id)
                      ? { backgroundImage: `url('${thumbnails.get(recentNotices[1].property_id)}')` }
                      : undefined
                  }
                />
                <div>
                  <span className="tag-pill gray">{propertyById.get(recentNotices[1].property_id)?.name ?? 'NOTICE'}</span>
                  <div className="ut">{recentNotices[1].title}</div>
                  <div className="ud">{recentNotices[1].description}</div>
                  <div className="udate">{fmtDate(recentNotices[1].notice_date)}</div>
                </div>
              </div>
            ) : (
              <div className="empty-note">No notices yet.</div>
            )}
          </div>
        </div>
      </div>

      <button className="card stay-informed" onClick={() => navigate('/updates')} type="button">
        <div className="ic-circle">💬</div>
        <div>
          <h5>Stay informed</h5>
          <p>We regularly share important updates and reports. Check the Investor Updates section for the latest information.</p>
        </div>
        <div className="chev">›</div>
      </button>
    </>
  )
}
