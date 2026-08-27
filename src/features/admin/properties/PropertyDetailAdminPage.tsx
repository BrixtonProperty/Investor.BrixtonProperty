import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useArchiveProperty, useProperty, useUpdateProperty } from '../../../queries/properties'
import { usePropertyPhotos, useSignedPhotoUrls } from '../../../queries/propertyPhotos'
import { useDocuments } from '../../../queries/documents'
import { useTenants } from '../../../queries/tenants'
import { useNotices, useCreateNotice, useUpdateNotice, useDeleteNotice } from '../../../queries/notices'
import { fmtCurrency, fmtDate, fmtPct } from '../../../lib/format'
import { useToast } from '../../../components/Toast'
import StatList from '../../../components/StatList'
import Modal from '../../../components/Modal'
import Icon from '../../../components/Icon'
import type { Property, Notice } from '../../../types/database.types'

type PropertyForm = Pick<
  Property,
  | 'name'
  | 'location'
  | 'description'
  | 'total_value'
  | 'initial_investment_amount'
  | 'total_equity_invested'
  | 'loan_value'
  | 'valuation_date'
  | 'type'
  | 'size'
  | 'occupancy'
  | 'year_built'
>

export default function PropertyDetailAdminPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const property = useProperty(id)
  const photos = usePropertyPhotos(id)
  const documents = useDocuments(id)
  const tenants = useTenants(id)
  const notices = useNotices(id)
  const updateProperty = useUpdateProperty()
  const archiveProperty = useArchiveProperty()
  const createNotice = useCreateNotice()
  const updateNotice = useUpdateNotice()
  const deleteNotice = useDeleteNotice()
  const toast = useToast()

  const signed = useSignedPhotoUrls((photos.data ?? []).map((p) => p.storage_path))

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PropertyForm | null>(null)
  const [noticeModal, setNoticeModal] = useState<'add' | Notice | null>(null)
  const [noticeForm, setNoticeForm] = useState({ title: '', description: '', notice_date: new Date().toISOString().slice(0, 10) })

  useEffect(() => {
    if (property.data) {
      const p = property.data
      setForm({
        name: p.name,
        location: p.location,
        description: p.description,
        total_value: p.total_value,
        initial_investment_amount: p.initial_investment_amount,
        total_equity_invested: p.total_equity_invested,
        loan_value: p.loan_value,
        valuation_date: p.valuation_date,
        type: p.type,
        size: p.size,
        occupancy: p.occupancy,
        year_built: p.year_built,
      })
    }
  }, [property.data])

  if (property.isLoading || !form) return <div className="loading-state">Loading property…</div>
  if (!property.data) return <div className="error-state">Property not found.</div>
  const p = property.data
  const coverPhoto = (photos.data ?? []).find((ph) => ph.is_cover) ?? photos.data?.[0]
  const heroUrl = coverPhoto ? signed.data?.[coverPhoto.storage_path] : undefined

  async function handleSaveProperty(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !form) return
    try {
      await updateProperty.mutateAsync({ id, values: form })
      setEditing(false)
      toast.show('Property updated.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save changes.', 'error')
    }
  }

  async function handleArchive() {
    if (!id) return
    if (!confirm(`Archive ${p.name}? Investors will no longer see this property.`)) return
    await archiveProperty.mutateAsync(id)
    toast.show('Property archived.')
    navigate('/admin/properties')
  }

  function openNoticeModal(notice: 'add' | Notice) {
    if (notice === 'add') {
      setNoticeForm({ title: '', description: '', notice_date: new Date().toISOString().slice(0, 10) })
    } else {
      setNoticeForm({ title: notice.title, description: notice.description, notice_date: notice.notice_date })
    }
    setNoticeModal(notice)
  }

  async function handleSaveNotice(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    try {
      if (noticeModal === 'add') {
        await createNotice.mutateAsync({ property_id: id, ...noticeForm })
      } else if (noticeModal) {
        await updateNotice.mutateAsync({ id: noticeModal.id, values: noticeForm })
      }
      setNoticeModal(null)
      toast.show('Communication saved.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save.', 'error')
    }
  }

  async function handleDeleteNotice(notice: Notice) {
    if (!confirm('Delete this communication?')) return
    await deleteNotice.mutateAsync(notice)
    toast.show('Deleted.')
  }

  return (
    <>
      <button className="back-link" onClick={() => navigate('/admin/properties')} type="button">
        ← Back to Properties
      </button>
      <div className="detail-hero" style={heroUrl ? { backgroundImage: `url('${heroUrl}')` } : undefined}>
        <button className="edit-fab" onClick={() => navigate(`/admin/properties/${id}/photos`)} type="button" aria-label="Manage photos">
          <Icon name="edit" size={14} />
        </button>
      </div>
      <div className="page-head-row">
        <div>
          <h2 className="serif detail-name">{p.name}</h2>
          <div className="detail-loc">
            <span className="pin">
              <Icon name="pin" size={13} />
            </span>
            {p.location}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-outline" onClick={() => setEditing(true)} type="button">
            <Icon name="edit" size={12} /> EDIT DETAILS
          </button>
          <button className="btn-danger" onClick={handleArchive} type="button">
            ARCHIVE
          </button>
        </div>
      </div>
      <div className="detail-desc">{p.description || <em style={{ color: 'var(--text-faint)' }}>No description yet.</em>}</div>

      <div className="detail-grid">
        <div className="card">
          <div className="section-label">INVESTMENT OVERVIEW</div>
          <StatList
            rows={[
              { icon: '$', label: 'Latest Valuation', value: fmtCurrency(p.total_value), caption: `As at ${fmtDate(p.valuation_date)}` },
              { icon: '$', label: 'Initial Investment Amount', value: p.initial_investment_amount != null ? fmtCurrency(p.initial_investment_amount) : '—' },
              { icon: '$', label: 'Total Equity Invested', value: p.total_equity_invested != null ? fmtCurrency(p.total_equity_invested) : '—' },
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
          <div className="section-label">
            PROPERTY PHOTOS
            <button className="field-edit-btn" onClick={() => navigate(`/admin/properties/${id}/photos`)} type="button">
              MANAGE
            </button>
          </div>
          <div className="photo-grid">
            <div className="photo-main" style={heroUrl ? { backgroundImage: `url('${heroUrl}')` } : undefined} />
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              {photos.data?.length ?? 0} photo(s) published.
              {coverPhoto ? '' : ' No cover photo set yet.'}
            </div>
            <button className="btn-outline" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate(`/admin/properties/${id}/photos`)}>
              MANAGE PHOTOS
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-label">
            LATEST DOCUMENTS
            <button className="field-edit-btn" onClick={() => navigate(`/admin/properties/${id}/documents`)} type="button">
              MANAGE
            </button>
          </div>
          <div className="doc-list">
            {(documents.data ?? []).length === 0 && (
              <div style={{ color: 'var(--text-faint)', fontSize: 13, padding: '8px 0' }}>No documents published yet.</div>
            )}
            {(documents.data ?? []).slice(0, 6).map((d) => (
              <div className="doc-row" key={d.id} style={{ cursor: 'default' }}>
                <div>
                  {d.name}
                  <div className="doc-date">{fmtDate(d.date_added)}</div>
                </div>
              </div>
            ))}
            <button className="btn-outline" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate(`/admin/properties/${id}/documents`)}>
              MANAGE DOCUMENTS
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div className="section-label">
          TENANTS
          <button className="field-edit-btn" onClick={() => navigate(`/admin/properties/${id}/tenants`)} type="button">
            MANAGE
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: '4px 0 12px' }}>
          {(tenants.data ?? []).length === 0 ? 'No tenants added yet.' : `${tenants.data?.length} tenant(s) on this property.`}
        </div>
        <button className="btn-outline" style={{ width: '100%' }} onClick={() => navigate(`/admin/properties/${id}/tenants`)}>
          MANAGE TENANTS
        </button>
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div className="panel-head">
          <h4>Communications</h4>
          <button className="view-all" onClick={() => openNoticeModal('add')} type="button">
            + ADD
          </button>
        </div>
        {(notices.data ?? []).length === 0 && <div className="empty-note">No communications yet.</div>}
        {(notices.data ?? []).map((n) => (
          <div className="update-card-sm" key={n.id} style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div className="ut">{n.title}</div>
              <div className="ud">{n.description}</div>
              <div className="udate">{fmtDate(n.notice_date)}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-icon" onClick={() => openNoticeModal(n)} type="button" aria-label="Edit">
                <Icon name="edit" size={14} />
              </button>
              <button className="btn-icon" onClick={() => handleDeleteNotice(n)} type="button" aria-label="Delete">
                <Icon name="close" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal
          title="Edit Property Details"
          onClose={() => setEditing(false)}
          footer={
            <>
              <button className="btn-outline" type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn-solid" type="submit" form="edit-property-form" disabled={updateProperty.isPending}>
                {updateProperty.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form id="edit-property-form" onSubmit={handleSaveProperty}>
            <label className="field-label">Name</label>
            <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="field-label">Location</label>
            <input className="form-input" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <label className="field-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label className="field-label">Latest Valuation ($)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.total_value}
              onChange={(e) => setForm({ ...form, total_value: Number(e.target.value) })}
            />
            <label className="field-label">Initial Investment Amount ($)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="What Brixton originally paid to acquire it"
              value={form.initial_investment_amount ?? ''}
              onChange={(e) => setForm({ ...form, initial_investment_amount: e.target.value ? Number(e.target.value) : null })}
            />
            <label className="field-label">Total Equity Invested ($)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Total equity invested into the property at purchase"
              value={form.total_equity_invested ?? ''}
              onChange={(e) => setForm({ ...form, total_equity_invested: e.target.value ? Number(e.target.value) : null })}
            />
            <label className="field-label">Loan Value ($)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Outstanding loan balance against this property"
              value={form.loan_value ?? ''}
              onChange={(e) => setForm({ ...form, loan_value: e.target.value ? Number(e.target.value) : null })}
            />
            <label className="field-label">Valuation Date</label>
            <input
              className="form-input"
              type="date"
              required
              value={form.valuation_date}
              onChange={(e) => setForm({ ...form, valuation_date: e.target.value })}
            />
            <label className="field-label">Property Type</label>
            <input className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <label className="field-label">Net Lettable Area (NLA)</label>
            <input className="form-input" value={form.size ?? ''} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 6,250 m²" />
            <label className="field-label">Occupancy</label>
            <input className="form-input" value={form.occupancy ?? ''} onChange={(e) => setForm({ ...form, occupancy: e.target.value })} placeholder="e.g. 100%" />
            <label className="field-label">Year Built / Renovated</label>
            <input
              className="form-input"
              type="number"
              value={form.year_built ?? ''}
              onChange={(e) => setForm({ ...form, year_built: e.target.value ? Number(e.target.value) : null })}
            />
          </form>
        </Modal>
      )}

      {noticeModal && (
        <Modal
          title={noticeModal === 'add' ? 'Add Communication' : 'Edit Communication'}
          onClose={() => setNoticeModal(null)}
          footer={
            <>
              <button className="btn-outline" type="button" onClick={() => setNoticeModal(null)}>
                Cancel
              </button>
              <button className="btn-solid" type="submit" form="notice-form">
                Save
              </button>
            </>
          }
        >
          <form id="notice-form" onSubmit={handleSaveNotice}>
            <label className="field-label">Title</label>
            <input className="form-input" required value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} />
            <label className="field-label">Description</label>
            <textarea
              className="form-textarea"
              value={noticeForm.description}
              onChange={(e) => setNoticeForm({ ...noticeForm, description: e.target.value })}
            />
            <label className="field-label">Date</label>
            <input
              className="form-input"
              type="date"
              required
              value={noticeForm.notice_date}
              onChange={(e) => setNoticeForm({ ...noticeForm, notice_date: e.target.value })}
            />
          </form>
        </Modal>
      )}
    </>
  )
}
