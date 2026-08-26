import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { supabase } from '../lib/supabaseClient'

export default function RootRedirect() {
  const { session, investorUser, loading } = useAuth()
  if (loading) return <div className="center-screen loading-state">Loading…</div>
  if (!session) return <Navigate to="/login" replace />
  if (!investorUser) {
    // A valid session with no matching investor_users row -- shouldn't
    // happen for a properly-provisioned account, but leaving this as an
    // infinite spinner traps anyone who does hit it with no way out.
    return (
      <div className="center-screen">
        <div className="card" style={{ padding: 32, maxWidth: 420, textAlign: 'center' }}>
          <h2 className="serif" style={{ marginTop: 0 }}>
            Account not fully set up
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            Your login exists but isn't linked to an investor or admin record yet. Contact Brixton Property to
            get this sorted.
          </p>
          <button className="btn-outline" type="button" onClick={() => supabase.auth.signOut()}>
            Log Out
          </button>
        </div>
      </div>
    )
  }
  // Wherever the invite/magic link actually redirected to (this can drift
  // from /accept-invite depending on the Supabase project's Site URL /
  // Redirect URLs config), a still-pending account must set a password
  // before going anywhere else.
  if (investorUser.invite_status === 'pending') return <Navigate to="/accept-invite" replace />
  return <Navigate to={investorUser.role === 'admin' ? '/admin/properties' : '/dashboard'} replace />
}
