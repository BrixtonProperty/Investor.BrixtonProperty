import { useMemo, useState } from 'react'
import { useProperties, useCreateProperty } from '../../../queries/properties'
import { usePropertyThumbnails } from '../../../queries/propertyPhotos'
import { fmtCurrency, fmtDate } from '../../../lib/format'
import { useToast } from '../../../components/Toast'
import PropertyCard from '../../../components/PropertyCard'
import Modal from '../../../components/Modal'

export default function PropertiesAdminPage() {
  const properties = useProperties()
  const propertyIds = useMemo(() => properties.data?.map((p) => p.id) ?? [], [properties.data])
  const { thumbnails } = usePropertyThumbnails(propertyIds)
  const createProperty = useCreateProperty()
  const toast = useToast()

  const [showAdd, setShowAdd] = useState(false)
  const emptyForm = {
    name: '',
    location: '',
    total_value: '',
    initial_investment_amount: '',
    total_equity_invested: '',
    loan_value: '',
    valuation_date: new Date().toISOString().slice(0, 10),
    type: '',
    size: '',
    occupancy: '',
    year_built: '',
  }
  const [form, setForm] = useState(emptyForm)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const created = await createProperty.mutateAsync({
        name: form.name,
        location: form.location,
        total_value: Number(form.total_value),
        initial_investment_amount: form.initial_investment_amount ? Number(form.initial_investment_amount) : null,
        total_equity_invested: form.total_equity_invested ? Number(form.total_equity_invested) : null,
        loan_value: form.loan_value ? Number(form.loan_value) : null,
        valuation_date: form.valuation_date,
        type: form.type,
        size: form.size || null,
        occupancy: form.occupancy || null,
        year_built: form.year_built ? Number(form.year_built) : null,
        description: '',
      })
      setShowAdd(false)
      setForm(emptyForm)
      toast.show(`${created.name} added.`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not add property.', 'error')
    }
  }

  if (properties.isLoading) return <div className="loading-state">Loading properties…</div>

  return (
    <>
      <div className="page-head-row">
        <div>
          <h1 className="page-title serif">Properties</h1>
          <div className="page-sub">Every property in the system.</div>
        </div>
        <button className="btn-solid" onClick={() => setShowAdd(true)} type="button">
          + ADD PROPERTY
        </button>
      </div>

      <div className="prop-grid">
        {(properties.data ?? []).map((p) => (
          <PropertyCard
            key={p.id}
            to={`/admin/properties/${p.id}`}
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
        <button className="add-tile" onClick={() => setShowAdd(true)} type="button">
          <span className="plus">+</span>
          Add Property
        </button>
      </div>

      {showAdd && (
        <Modal
          title="Add Property"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <button className="btn-outline" type="button" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="btn-solid" type="submit" form="add-property-form" disabled={createProperty.isPending}>
                {createProperty.isPending ? 'Adding…' : 'Add Property'}
              </button>
            </>
          }
        >
          <form id="add-property-form" onSubmit={handleCreate}>
            <label className="field-label">Name</label>
            <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="field-label">Location</label>
            <input className="form-input" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <label className="field-label">Type</label>
            <input className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g. Commercial Office" />
            <label className="field-label">Latest Valuation ($)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.total_value}
              onChange={(e) => setForm({ ...form, total_value: e.target.value })}
            />
            <label className="field-label">Initial Investment Amount ($)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="What Brixton originally paid to acquire it"
              value={form.initial_investment_amount}
              onChange={(e) => setForm({ ...form, initial_investment_amount: e.target.value })}
            />
            <label className="field-label">Total Equity Invested ($)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Total equity invested into the property at purchase"
              value={form.total_equity_invested}
              onChange={(e) => setForm({ ...form, total_equity_invested: e.target.value })}
            />
            <label className="field-label">Loan Value ($)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Outstanding loan balance against this property"
              value={form.loan_value}
              onChange={(e) => setForm({ ...form, loan_value: e.target.value })}
            />
            <label className="field-label">Valuation Date</label>
            <input
              className="form-input"
              type="date"
              required
              value={form.valuation_date}
              onChange={(e) => setForm({ ...form, valuation_date: e.target.value })}
            />
            <label className="field-label">Net Lettable Area (NLA)</label>
            <input
              className="form-input"
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              placeholder="e.g. 6,250 m²"
            />
            <label className="field-label">Occupancy</label>
            <input
              className="form-input"
              value={form.occupancy}
              onChange={(e) => setForm({ ...form, occupancy: e.target.value })}
              placeholder="e.g. 100%"
            />
            <label className="field-label">Year Built / Renovated</label>
            <input
              className="form-input"
              type="number"
              value={form.year_built}
              onChange={(e) => setForm({ ...form, year_built: e.target.value })}
            />
          </form>
        </Modal>
      )}
    </>
  )
}
