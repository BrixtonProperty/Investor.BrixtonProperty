import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProperty } from '../../../queries/properties'
import { useTenants, useCreateTenant, useUpdateTenant, useDeleteTenant } from '../../../queries/tenants'
import { fmtDate } from '../../../lib/format'
import { useToast } from '../../../components/Toast'
import Breadcrumb from '../../../components/Breadcrumb'
import Modal from '../../../components/Modal'
import Icon from '../../../components/Icon'
import type { PropertyTenant } from '../../../types/database.types'

const emptyForm = { name: '', lease_term: '', lease_expiry: '', description: '' }

export default function TenantsAdminPage() {
  const { id } = useParams<{ id: string }>()
  const property = useProperty(id)
  const tenants = useTenants(id)
  const createTenant = useCreateTenant()
  const updateTenant = useUpdateTenant()
  const deleteTenant = useDeleteTenant()
  const toast = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<PropertyTenant | null>(null)
  const [form, setForm] = useState(emptyForm)

  if (property.isLoading) return <div className="loading-state">Loading tenants…</div>
  if (!property.data || !id) return <div className="error-state">Property not found.</div>
  const p = property.data

  function openAdd() {
    setForm(emptyForm)
    setAddOpen(true)
  }

  function openEdit(t: PropertyTenant) {
    setForm({
      name: t.name,
      lease_term: t.lease_term ?? '',
      lease_expiry: t.lease_expiry ?? '',
      description: t.description,
    })
    setEditing(t)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    try {
      await createTenant.mutateAsync({
        property_id: id,
        name: form.name,
        lease_term: form.lease_term || null,
        lease_expiry: form.lease_expiry || null,
        description: form.description,
      })
      setAddOpen(false)
      toast.show('Tenant added.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not add tenant.', 'error')
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    try {
      await updateTenant.mutateAsync({
        id: editing.id,
        values: {
          name: form.name,
          lease_term: form.lease_term || null,
          lease_expiry: form.lease_expiry || null,
          description: form.description,
        },
      })
      setEditing(null)
      toast.show('Tenant updated.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save.', 'error')
    }
  }

  async function handleDelete(t: PropertyTenant) {
    if (!confirm(`Remove ${t.name} from this property?`)) return
    await deleteTenant.mutateAsync(t)
    toast.show('Tenant removed.')
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Properties', to: '/admin/properties' },
          { label: p.name, to: `/admin/properties/${p.id}` },
          { label: 'Tenants' },
        ]}
      />
      <div className="sub-eyebrow">{p.name}</div>
      <div className="page-head-row">
        <div>
          <h1 className="page-title serif">Manage Tenants</h1>
          <div className="page-sub">Add, edit, or remove tenants for {p.name}.</div>
        </div>
        <button className="btn-solid" onClick={openAdd} type="button">
          + ADD TENANT
        </button>
      </div>

      <div className="card">
        <div className="admin-table-head" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1.6fr 60px' }}>
          <div>Tenant</div>
          <div>Lease Term</div>
          <div>Lease Expiry</div>
          <div>Description</div>
          <div></div>
        </div>
        {(tenants.data ?? []).length === 0 && <div className="empty-state">No tenants yet — add the first one above.</div>}
        {(tenants.data ?? []).map((t) => (
          <div className="admin-table-row" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1.6fr 60px', cursor: 'default' }} key={t.id}>
            <div style={{ fontWeight: 600 }}>{t.name}</div>
            <div>{t.lease_term || '—'}</div>
            <div>{fmtDate(t.lease_expiry)}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>{t.description || '—'}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-icon" onClick={() => openEdit(t)} type="button" aria-label="Edit tenant">
                <Icon name="edit" size={13} />
              </button>
              <button className="btn-icon" onClick={() => handleDelete(t)} type="button" aria-label="Delete tenant">
                <Icon name="close" size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(addOpen || editing) && (
        <Modal
          title={editing ? 'Edit Tenant' : 'Add Tenant'}
          onClose={() => {
            setAddOpen(false)
            setEditing(null)
          }}
          footer={
            <>
              <button
                className="btn-outline"
                type="button"
                onClick={() => {
                  setAddOpen(false)
                  setEditing(null)
                }}
              >
                Cancel
              </button>
              <button className="btn-solid" type="submit" form="tenant-form" disabled={createTenant.isPending || updateTenant.isPending}>
                {createTenant.isPending || updateTenant.isPending ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <form id="tenant-form" onSubmit={editing ? handleSaveEdit : handleAdd}>
            <label className="field-label">Tenant name</label>
            <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="field-label">Lease term</label>
            <input
              className="form-input"
              placeholder="e.g. 6 years, 2 x 3 year rights of renewal"
              value={form.lease_term}
              onChange={(e) => setForm({ ...form, lease_term: e.target.value })}
            />
            <label className="field-label">Lease expiry</label>
            <input
              className="form-input"
              type="date"
              value={form.lease_expiry}
              onChange={(e) => setForm({ ...form, lease_expiry: e.target.value })}
            />
            <label className="field-label">Description</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </form>
        </Modal>
      )}
    </>
  )
}
