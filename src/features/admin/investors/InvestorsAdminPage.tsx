import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvestorAccounts } from '../../../queries/investorAccounts'
import { useAllInvestorUsers, useCreateInvestorUser } from '../../../queries/investorUsers'
import { useToast } from '../../../components/Toast'
import Modal from '../../../components/Modal'

export default function InvestorsAdminPage() {
  const navigate = useNavigate()
  const accounts = useInvestorAccounts()
  const users = useAllInvestorUsers()
  const createInvestor = useCreateInvestorUser()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', newAccountDisplayName: '', existingAccountId: '' })

  const loginCountByAccount = useMemo(() => {
    const map = new Map<string, number>()
    for (const u of users.data ?? []) {
      if (u.investor_account_id) map.set(u.investor_account_id, (map.get(u.investor_account_id) ?? 0) + 1)
    }
    return map
  }, [users.data])

  const filtered = (accounts.data ?? []).filter((a) => a.display_name.toLowerCase().includes(search.toLowerCase()))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const result = await createInvestor.mutateAsync({
        name: form.name,
        email: form.email,
        investorAccountId: form.existingAccountId || undefined,
        newAccountDisplayName: form.existingAccountId ? undefined : form.newAccountDisplayName,
      })
      setInviteLink(result.inviteLink)
      toast.show('Investor created.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not create investor.', 'error')
    }
  }

  function closeAdd() {
    setAddOpen(false)
    setInviteLink(null)
    setForm({ name: '', email: '', newAccountDisplayName: '', existingAccountId: '' })
  }

  if (accounts.isLoading) return <div className="loading-state">Loading investors…</div>

  return (
    <>
      <div className="page-head-row">
        <div>
          <h1 className="page-title serif">Investors</h1>
          <div className="page-sub">Investor accounts and their holdings, profiles, and logins.</div>
        </div>
        <button className="btn-solid" onClick={() => setAddOpen(true)} type="button">
          + ADD INVESTOR
        </button>
      </div>

      <div className="admin-list-toolbar">
        <div className="admin-search">
          🔍
          <input type="text" placeholder="Search investors..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="admin-table-head" style={{ gridTemplateColumns: '2fr 1fr 100px 20px' }}>
          <div>Investor</div>
          <div>Logins</div>
          <div></div>
          <div></div>
        </div>
        {filtered.length === 0 && <div className="empty-state">No investors yet — add the first one above.</div>}
        {filtered.map((a) => (
          <div
            className="admin-table-row"
            style={{ gridTemplateColumns: '2fr 1fr 100px 20px' }}
            key={a.id}
            onClick={() => navigate(`/admin/investors/${a.id}`)}
          >
            <div style={{ fontWeight: 600 }}>{a.display_name}</div>
            <div>{loginCountByAccount.get(a.id) ?? 0}</div>
            <div />
            <div style={{ color: 'var(--orange)' }}>›</div>
          </div>
        ))}
      </div>

      {addOpen && (
        <Modal title="Add Investor" onClose={closeAdd} footer={
          inviteLink ? (
            <button className="btn-solid" type="button" onClick={closeAdd}>
              Done
            </button>
          ) : (
            <>
              <button className="btn-outline" type="button" onClick={closeAdd}>
                Cancel
              </button>
              <button className="btn-solid" type="submit" form="add-investor-form" disabled={createInvestor.isPending}>
                {createInvestor.isPending ? 'Creating…' : 'Create Investor'}
              </button>
            </>
          )
        }>
          {inviteLink ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Account created. Copy this invite link and send it to the investor yourself (e.g. via email) — it is
                not sent automatically.
              </p>
              <div className="invite-box">
                <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                <button
                  className="btn-text"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                >
                  Copy
                </button>
              </div>
            </>
          ) : (
            <form id="add-investor-form" onSubmit={handleCreate}>
              <label className="field-label">Investor name</label>
              <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <label className="field-label">Email</label>
              <input className="form-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <label className="field-label">Investor entity</label>
              <select
                className="form-select"
                value={form.existingAccountId}
                onChange={(e) => setForm({ ...form, existingAccountId: e.target.value })}
              >
                <option value="">+ Create a new entity…</option>
                {(accounts.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.display_name} (add as an additional login)
                  </option>
                ))}
              </select>
              {!form.existingAccountId && (
                <>
                  <label className="field-label">New entity name</label>
                  <input
                    className="form-input"
                    required
                    placeholder="e.g. Smith Family Trust"
                    value={form.newAccountDisplayName}
                    onChange={(e) => setForm({ ...form, newAccountDisplayName: e.target.value })}
                  />
                </>
              )}
            </form>
          )}
        </Modal>
      )}
    </>
  )
}
