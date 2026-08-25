import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RootRedirect() {
  const { session, investorUser, loading } = useAuth()
  if (loading) return <div className="center-screen loading-state">Loading…</div>
  if (!session) return <Navigate to="/login" replace />
  if (!investorUser) return <div className="center-screen loading-state">Loading…</div>
  return <Navigate to={investorUser.role === 'admin' ? '/admin/properties' : '/dashboard'} replace />
}
