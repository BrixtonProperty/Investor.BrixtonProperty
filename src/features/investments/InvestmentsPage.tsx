import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProperties } from '../../queries/properties'
import { useInvestorHoldings } from '../../queries/investorHoldings'
import { usePropertyThumbnails } from '../../queries/propertyPhotos'
import { fmtCurrency, fmtDate, fmtPct } from '../../lib/format'
import PropertyCard from '../../components/PropertyCard'
import Icon from '../../components/Icon'

export default function InvestmentsPage() {
  const navigate = useNavigate()
  const properties = useProperties()
  const holdings = useInvestorHoldings()
  const propertyIds = useMemo(() => properties.data?.map((p) => p.id) ?? [], [properties.data])
  const { thumbnails } = usePropertyThumbnails(propertyIds)

  const holdingByProperty = useMemo(
    () => new Map((holdings.data ?? []).map((h) => [h.property_id, h])),
    [holdings.data],
  )

  if (properties.isLoading) return <div className="loading-state">Loading investments…</div>

  return (
    <>
      <h1 className="page-title serif">Investments</h1>
      <div className="page-sub">An overview of your property investments across Brixton.</div>

      {(properties.data ?? []).length === 0 && (
        <div className="empty-state">You don't have any investments linked to your account yet.</div>
      )}

      <div className="prop-grid">
        {(properties.data ?? []).map((p) => {
          const h = holdingByProperty.get(p.id)
          return (
            <PropertyCard
              key={p.id}
              to={`/investments/${p.id}`}
              imageUrl={thumbnails.get(p.id)}
              name={p.name}
              location={p.location}
              stats={[
                { label: 'LATEST VALUATION', value: fmtCurrency(p.total_value) },
                { label: 'OWNERSHIP', value: h ? fmtPct(h.ownership_pct) : '—' },
                { label: 'AS AT', value: fmtDate(p.valuation_date) },
              ]}
            />
          )
        })}
      </div>

      <div className="card assist" style={{ marginTop: 22 }}>
        <div className="assist-l">
          <div className="ic-circle" style={{ width: 44, height: 44, fontSize: 18 }}>
            <Icon name="headset" size={20} />
          </div>
          <div>
            <h4>Need assistance?</h4>
            <p>If you have any questions or need support, our investor relations team is here to help.</p>
          </div>
        </div>
        <button className="btn-outline" onClick={() => navigate('/contact')} type="button">
          CONTACT US
        </button>
      </div>
    </>
  )
}
