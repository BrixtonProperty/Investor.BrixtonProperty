import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvestorAccounts, useCreateInvestorAccount } from '../../../queries/investorAccounts'
import { useAllInvestorUsers, useCreateInvestorUser } from '../../../queries/investorUsers'
import { useToast } from '../../../components/Toast'
import Modal from '../../../components/Modal'
import Icon from '../../../components/Icon'

export default function InvestorsAdminPage() {
  const navigate = useNavigate()
  const accounts = useInvestorAccounts()
  const users = useAllInvestorUsers()
  const createAccount = useCreateInvestorAccount()
  const createAdmin = useCreateInvestorUser()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [role, setRole] = useState<'investor' | 'admin'>('investor')
  const [investorName, setInvestorName] = useState('')
  const [adminForm, setAdminForm] = useState({ name: '', email: '' })
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const admins = (users.data ?? []).filter((u) => u.role === 'admin')

  const loginCountByAccount = useMemo(() => {
    const map = new Map<string, number>()
    for (const u of users.data ?? []) {
      if (u.investor_account_id) map.set(u.investor_account_id, (map.get(u.investor_account_id) ?? 0) + 1)
    }
    return map
  }, [users.data])

  const filtered = (accounts.data ?? []).filter((a) => a.display_name.toLowerCase().includes(search.toLowerCase()))

  // Step 1 of 2: just the investor record itself (name + entity) -- no email,
  // no login. Property assignment, ownership %, and Initial Investment are
  // set from the investor's own detail page (Holdings tab) right after.
  // Step 2 ("set up account" / send an invite) happens later, whenever the
  // admin is ready, from that same investor's Logins tab.
  async function handleCreateInvestor(e: React.FormEvent) {
    e.preventDefault()
    try {
      const account = await createAccount.mutateAsync(investorName)
      setAddOpen(false)
      setInvestorName('')
      toast.show(`${account.display_name} added — assign their holdings next.`)
      navigate(`/admin/investors/${account.id}`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not add investor.', 'error')
    }
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    try {
      const result = await createAdmin.mutateAsync({ name: adminForm.name, email: adminForm.email, role: 'admin' })
      setInviteLink(result.inviteLink)
      toast.show('Admin created.')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not create admin.', 'error')
    }
  }

  function closeAdd() {
    setAddOpen(false)
    setRole('investor')
    setInvestorName('')
    setAdminForm({ name: '', email: '' })
    setInviteLink(null)
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
          <Icon name="search" size={15} />
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

      <div className="panel-head" style={{ padding: '0', marginTop: 28, marginBottom: 4 }}>
        <h4>Brixton Admins</h4>
      </div>
      <div className="card">
        {admins.length === 0 && <div className="empty-state">No admins yet.</div>}
        {admins.map((u) => (
          <div className="admin-table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr', cursor: 'default' }} key={u.id}>
            <div>
              <div style={{ fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{u.email}</div>
            </div>
            <span className={'status-pill ' + (u.is_active ? 'active' : 'inactive')}>{u.is_active ? 'Active' : 'Deactivated'}</span>
            <span className={'status-pill ' + (u.invite_status === 'accepted' ? 'active' : 'pending')}>
              {u.invite_status === 'accepted' ? 'Signed up' : 'Invite pending'}
            </span>
          </div>
        ))}
      </div>

      {addOpen && (
        <Modal
          title={role === 'admin' ? 'Add Admin' : 'Add Investor'}
          onClose={closeAdd}
          footer={
            inviteLink ? (
              <button className="btn-solid" type="button" onClick={closeAdd}>
                Done
              </button>
            ) : (
              <>
                <button className="btn-outline" type="button" onClick={closeAdd}>
                  Cancel
                </button>
                <button
                  className="btn-solid"
                  type="submit"
                  form={role === 'admin' ? 'add-admin-form' : 'add-investor-form'}
                  disabled={role === 'admin' ? createAdmin.isPending : createAccount.isPending}
                >
                  {role === 'admin'
                    ? createAdmin.isPending
                      ? 'Creating…'
                      : 'Create Admin'
                    : createAccount.isPending
                      ? 'Adding…'
                      : 'Add Investor'}
                </button>
              </>
            )
          }
        >
          {inviteLink ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Account created. Copy this invite link and send it to them yourself (e.g. via email) — it is not
                sent automatically.
              </p>
              <div className="invite-box">
                <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                <button className="btn-text" type="button" onClick={() => navigator.clipboard.writeText(inviteLink)}>
                  Copy
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="field-label">Type</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  className={role === 'investor' ? 'btn-solid' : 'btn-outline'}
                  onClick={() => setRole('investor')}
                >
                  Investor
                </button>
                <button type="button" className={role === 'admin' ? 'btn-solid' : 'btn-outline'} onClick={() => setRole('admin')}>
                  Admin (Brixton staff)
                </button>
              </div>

              {role === 'investor' ? (
                <form id="add-investor-form" onSubmit={handleCreateInvestor}>
                  <label className="field-label">Investor / entity name</label>
                  <input
                    className="form-input"
                    required
                    placeholder="e.g. Smith Family Trust"
                    value={investorName}
                    onChange={(e) => setInvestorName(e.target.value)}
                  />
                  <p className="form-note">
                    This just creates the record so you can assign their property holdings, ownership %, and
                    Initial Investment. No email or login needed yet — you'll set up their account (and generate
                    an invite link) separately, whenever you're ready, from their Logins tab.
                  </p>
                </form>
              ) : (
                <form id="add-admin-form" onSubmit={handleCreateAdmin}>
                  <label className="field-label">Admin name</label>
                  <input
                    className="form-input"
                    required
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  />
                  <label className="field-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    required
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  />
                  <p className="form-note">
                    Admin accounts don't own any investor entity or holdings — they'll be forced through MFA
                    enrollment before reaching the admin panel.
                  </p>
                </form>
              )}
            </>
          )}
        </Modal>
      )}
    </>
  )
}
