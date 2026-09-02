import { useNavigate, useParams } from 'react-router-dom'
import { useProperty } from '../../../queries/properties'
import { usePropertyPhotos, useSignedPhotoUrls } from '../../../queries/propertyPhotos'
import { useDocuments } from '../../../queries/documents'
import { useTenants } from '../../../queries/tenants'
import { fmtCurrency, fmtDate, fmtPct, fmtLeaseTerm } from '../../../lib/format'
import { openDocument } from '../../../lib/signedUrl'
import StatList from '../../../components/StatList'
import Icon from '../../../components/Icon'

/** Read-only, admin's unscoped equivalent of the investor Property Detail page. */
export default function PortfolioPropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const property = useProperty(id)
  const photos = usePropertyPhotos(id)
  const documents = useDocuments(id)
  const tenants = useTenants(id)
  const signed = useSignedPhotoUrls((photos.data ?? []).map((p) => p.storage_path))

  if (property.isLoading) return <div className="loading-state">Loading property…</div>
  if (!property.data) return <div className="error-state">Property not found.</div>

  const p = property.data
  const heroPhoto = (photos.data ?? []).find((ph) => ph.is_cover) ?? photos.data?.[0]
  const heroUrl = heroPhoto ? signed.data?.[heroPhoto.storage_path] : undefined
  const subPhotos = (photos.data ?? []).filter((ph) => ph.id !== heroPhoto?.id).slice(0, 6)
  const recentDocs = (documents.data ?? []).slice(0, 6)

  async function handleOpenDoc(path: string) {
    try {
      await openDocument(path)
    } catch {
      // signed-URL generation failed -- no-op, user can retry
    }
  }

  return (
    <>
      <button className="back-link" onClick={() => navigate('/admin/portfolio/investments')} type="button">
        ← Back to Investments
      </button>
      <div className="detail-hero" style={heroUrl ? { backgroundImage: `url('${heroUrl}')` } : undefined} />
      <h2 className="serif detail-name">{p.name}</h2>
      <div className="detail-loc">
        <span className="pin">
          <Icon name="pin" size={13} />
        </span>
        {p.location}
      </div>
      <div className="detail-desc">{p.description}</div>

      <div className="detail-grid">
        <div className="card">
          <div className="section-label">INVESTMENT OVERVIEW</div>
          <StatList
            rows={[
              {
                icon: '$',
                label: 'Latest Valuation',
                value: fmtCurrency(p.total_value),
                caption: `As at ${fmtDate(p.valuation_date)}`,
              },
              {
                icon: '$',
                label: 'Initial Investment Amount',
                value: p.initial_investment_amount != null ? fmtCurrency(p.initial_investment_amount) : '—',
              },
              {
                icon: '$',
                label: 'Total Equity Invested',
                value: p.total_equity_invested != null ? fmtCurrency(p.total_equity_invested) : '—',
              },
              { icon: '$', label: 'Loan Value', value: p.loan_value != null ? fmtCurrency(p.loan_value) : '—' },
              {
                icon: '%',
                label: 'LVR',
                value: p.loan_value != null && p.total_value ? fmtPct((p.loan_value / p.total_value) * 100) : '—',
                caption: 'Loan Value ÷ Latest Valuation',
              },
              { icon: <Icon name="trendingUp" size={14} />, label: 'Property Type', value: p.type || '—' },
              { icon: <Icon name="pin" size={14} />, label: 'Location', value: p.location },
              { icon: <Icon name="building" size={14} />, label: 'Net Lettable Area (NLA)', value: p.size || '—' },
              { icon: '%', label: 'Occupancy', value: p.occupancy || '—' },
              { icon: <Icon name="calendar" size={14} />, label: 'Year Built / Renovated', value: p.year_built ?? '—' },
            ]}
          />
        </div>

        <div className="card">
          <div className="section-label">PROPERTY PHOTOS</div>
          <div className="photo-grid">
            <div className="photo-main" style={heroUrl ? { backgroundImage: `url('${heroUrl}')` } : undefined} />
            {subPhotos.length > 0 ? (
              <div className="photo-sub">
                {subPhotos.map((ph) => (
                  <div
                    key={ph.id}
                    style={signed.data?.[ph.storage_path] ? { backgroundImage: `url('${signed.data[ph.storage_path]}')` } : undefined}
                  />
                ))}
              </div>
            ) : (
              !heroUrl && <div style={{ color: 'var(--text-faint)', fontSize: 12, paddingTop: 8 }}>No photos published yet.</div>
            )}
            <button
              className="btn-outline"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => navigate(`/admin/portfolio/investments/${p.id}/photos`)}
            >
              VIEW ALL PHOTOS
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-label">LATEST DOCUMENTS</div>
          <div className="doc-list">
            {recentDocs.length === 0 && (
              <div style={{ color: 'var(--text-faint)', fontSize: 13, padding: '8px 0' }}>No documents published yet.</div>
            )}
            {recentDocs.map((d) => (
              <button key={d.id} className="doc-row" onClick={() => handleOpenDoc(d.storage_path)} type="button">
                <div>
                  {d.name}
                  <div className="doc-date">{fmtDate(d.date_added)}</div>
                </div>
                <div className="dl">↓</div>
              </button>
            ))}
            <button
              className="btn-outline"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => navigate(`/admin/portfolio/investments/${p.id}/documents`)}
            >
              VIEW ALL DOCUMENTS
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div className="section-label">TENANTS</div>
        <div className="doc-list">
          {(tenants.data ?? []).length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: '4px 0 12px' }}>No tenants listed yet.</div>
          )}
          {(tenants.data ?? []).map((t) => (
            <div className="doc-row" key={t.id} style={{ display: 'block', cursor: 'default' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{t.name}</div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: t.description ? 6 : 0 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Lease Term</div>
                  <div style={{ fontSize: 13 }}>{fmtLeaseTerm(t.lease_term)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Lease Expiry</div>
                  <div style={{ fontSize: 13 }}>{fmtDate(t.lease_expiry)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Right of Renewal</div>
                  <div style={{ fontSize: 13 }}>{t.right_of_renewal || '—'}</div>
                </div>
              </div>
              {t.description && <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{t.description}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="card assist" style={{ marginTop: 22 }}>
        <div className="assist-l">
          <div className="ic-circle" style={{ width: 44, height: 44, fontSize: 18 }}>
            <Icon name="headset" size={20} />
          </div>
          <div>
            <h4>Need to edit this property?</h4>
            <p>Switch back to the Admin tab to update valuation, photos, or documents.</p>
          </div>
        </div>
        <button className="btn-outline" onClick={() => navigate(`/admin/properties/${p.id}`)} type="button">
          EDIT IN ADMIN
        </button>
      </div>
    </>
  )
}
