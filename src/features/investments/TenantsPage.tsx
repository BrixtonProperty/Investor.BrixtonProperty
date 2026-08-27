import { useParams } from 'react-router-dom'
import { useProperty } from '../../queries/properties'
import { useTenants } from '../../queries/tenants'
import { fmtDate } from '../../lib/format'
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

      <div className="card">
        <div className="admin-table-head" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1.6fr' }}>
          <div>Tenant</div>
          <div>Lease Term</div>
          <div>Lease Expiry</div>
          <div>Description</div>
        </div>
        {(tenants.data ?? []).length === 0 && <div className="empty-state">No tenants listed yet.</div>}
        {(tenants.data ?? []).map((t) => (
          <div className="admin-table-row" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1.6fr', cursor: 'default' }} key={t.id}>
            <div style={{ fontWeight: 600 }}>{t.name}</div>
            <div>{t.lease_term || '—'}</div>
            <div>{fmtDate(t.lease_expiry)}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>{t.description || '—'}</div>
          </div>
        ))}
      </div>
    </>
  )
}
