import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { UserRole } from '../types/database.types'

/**
 * Gates a route subtree by role. For role="admin" it also requires an
 * MFA-verified session (aal2) — mirrors the is_admin_verified() RLS rule,
 * so the UI boundary and the database boundary never disagree.
 */
export default function RequireRole({ role }: { role: UserRole }) {
  const { investorUser, loading, aal, hasMfaFactor } = useAuth()

  if (loading) return <div className="center-screen loading-state">Loading…</div>
  if (!investorUser || !investorUser.is_active) return <Navigate to="/login" replace />
  if (investorUser.role !== role) {
    return <Navigate to={investorUser.role === 'admin' ? '/admin/properties' : '/dashboard'} replace />
  }
  if (role === 'admin') {
    if (!hasMfaFactor) return <Navigate to="/mfa-enroll" replace />
    if (aal !== 'aal2') return <Navigate to="/mfa-challenge" replace />
  }
  return <Outlet />
}
