import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RootRedirect() {
  const { session, investorUser, loading } = useAuth()
  if (loading) return <div className="center-screen loading-state">Loading…</div>
  if (!session) return <Navigate to="/login" replace />
  if (!investorUser) return <div className="center-screen loading-state">Loading…</div>
  // Wherever the invite/magic link actually redirected to (this can drift
  // from /accept-invite depending on the Supabase project's Site URL /
  // Redirect URLs config), a still-pending account must set a password
  // before going anywhere else.
  if (investorUser.invite_status === 'pending') return <Navigate to="/accept-invite" replace />
  return <Navigate to={investorUser.role === 'admin' ? '/admin/properties' : '/dashboard'} replace />
}
