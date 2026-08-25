import { useMemo } from 'react'
import { useProperties } from '../../../queries/properties'
import { usePropertyThumbnails } from '../../../queries/propertyPhotos'
import { fmtCurrency, fmtDate } from '../../../lib/format'
import PropertyCard from '../../../components/PropertyCard'

/** Admin's unscoped equivalent of the investor Investments grid -- every
 * property in the system, not just one investor's slice. */
export default function PortfolioInvestmentsPage() {
  const properties = useProperties()
  const propertyIds = useMemo(() => properties.data?.map((p) => p.id) ?? [], [properties.data])
  const { thumbnails } = usePropertyThumbnails(propertyIds)

  if (properties.isLoading) return <div className="loading-state">Loading investments…</div>

  return (
    <>
      <h1 className="page-title serif">Investments</h1>
      <div className="page-sub">Every property Brixton manages, across all investors.</div>

      {(properties.data ?? []).length === 0 && <div className="empty-state">No properties yet.</div>}

      <div className="prop-grid">
        {(properties.data ?? []).map((p) => (
          <PropertyCard
            key={p.id}
            to={`/admin/portfolio/investments/${p.id}`}
            imageUrl={thumbnails.get(p.id)}
            name={p.name}
            location={p.location}
            stats={[
              { label: 'LATEST VALUATION', value: fmtCurrency(p.total_value) },
              { label: 'INITIAL INVESTMENT', value: p.initial_investment_amount != null ? fmtCurrency(p.initial_investment_amount) : '—' },
              { label: 'TYPE', value: p.type || '—' },
              { label: 'AS AT', value: fmtDate(p.valuation_date) },
            ]}
          />
        ))}
      </div>
    </>
  )
}
