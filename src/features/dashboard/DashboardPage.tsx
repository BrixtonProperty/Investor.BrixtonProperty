import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { useProperties } from '../../queries/properties'
import { useInvestorHoldings } from '../../queries/investorHoldings'
import { usePropertyThumbnails } from '../../queries/propertyPhotos'
import { useMergedUpdates } from '../../queries/updatesFeed'
import { useSiteSettings } from '../../queries/siteSettings'
import { publicAssetUrl } from '../../lib/signedUrl'
import { fmtCurrency, fmtDate, fmtPct } from '../../lib/format'
import Icon from '../../components/Icon'

export default function DashboardPage() {
  const { investorUser } = useAuth()
  const navigate = useNavigate()
  const properties = useProperties()
  const holdings = useInvestorHoldings()
  const updates = useMergedUpdates()
  const { data: settings } = useSiteSettings()
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

  const heroUrl = publicAssetUrl(settings?.dashboard_hero_storage_path)
  const recentUpdates = updates.items.slice(0, 5)

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
            <div className="ic-circle">
              <Icon name="building" />
            </div>
            <div>
              <div className="slabel">Total Investments</div>
              <div className="sval">{summary.totalInvestments}</div>
              <div className="scap">properties</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="ic-circle">
              <Icon name="clock" />
            </div>
            <div>
              <div className="slabel">Total Invested</div>
              <div className="sval">{fmtCurrency(summary.totalInvested)}</div>
              <div className="scap">across all properties</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="ic-circle">
              <Icon name="trendingUp" />
            </div>
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
                      <span>Initial Investment</span>
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

        <div className="card">
          <div className="panel-head">
            <h4>Latest Investor Updates</h4>
            <button className="view-all" onClick={() => navigate('/updates')} type="button">
              VIEW ALL →
            </button>
          </div>
          {recentUpdates.length === 0 && <div className="empty-note">No updates published yet.</div>}
          {recentUpdates.map((item, i) => (
            <button
              className="update-card-sm"
              key={item.id}
              type="button"
              style={{ width: '100%', cursor: 'pointer', border: 'none', background: 'none', textAlign: 'left' }}
              onClick={() => navigate('/updates')}
            >
              <div
                className="thumb-sq"
                style={thumbnails.get(item.property_id) ? { backgroundImage: `url('${thumbnails.get(item.property_id)}')` } : undefined}
              />
              <div>
                <span className={'tag-pill' + (i % 2 === 1 ? ' gray' : '')}>{propertyById.get(item.property_id)?.name ?? 'UPDATE'}</span>
                <div className="ut">{item.title}</div>
                {item.description && <div className="ud">{item.description}</div>}
                <div className="udate">{fmtDate(item.date)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button className="card stay-informed" onClick={() => navigate('/updates')} type="button">
        <div className="ic-circle">
          <Icon name="chat" />
        </div>
        <div>
          <h5>Stay informed</h5>
          <p>We regularly share important updates and reports. Check the Investor Updates section for the latest information.</p>
        </div>
        <div className="chev">›</div>
      </button>
    </>
  )
}
