import { useParams } from 'react-router-dom'
import { useProperty } from '../../queries/properties'
import { useTenants } from '../../queries/tenants'
import { fmtDate, fmtLeaseTerm } from '../../lib/format'
import Breadcrumb from '../../components/Breadcrumb'

export default function TenantsPage() {
  const { id } = useParams<{ id: string }>()
  const property = useProperty(id)
  const tenants = useTenants(id)

  if (property.isLoading) return <div className="loading-state">Loading tenants…</div>
  if (!property.data) return <div className="error-state">Property not found.</div>
  const p = property.data

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Investments', to: '/investments' },
          { label: p.name, to: `/investments/${p.id}` },
          { label: 'Tenants' },
        ]}
      />
      <div className="sub-eyebrow">{p.name}</div>
      <h1 className="page-title serif">Tenants</h1>
      <div className="page-sub">Current tenants at {p.name}.</div>

      {(tenants.data ?? []).length === 0 && <div className="empty-state">No tenants listed yet.</div>}
      {(tenants.data ?? []).map((t) => (
        <div className="card" style={{ marginBottom: 16, padding: '18px 22px' }} key={t.id}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10 }}>{t.name}</div>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: t.description ? 10 : 0 }}>
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
          {t.description && <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>{t.description}</div>}
        </div>
      ))}
    </>
  )
}
