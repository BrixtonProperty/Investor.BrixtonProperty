import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="center-screen loading-state">Loading…</div>
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}
