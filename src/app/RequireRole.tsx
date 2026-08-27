import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { UserRole } from '../types/database.types'

const ADMIN_MFA_TRUST_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/** Set by MfaEnrollPage/MfaChallengePage right after a successful verify.
 * sessionStorage (not localStorage) is deliberate: it's cleared when the tab
 * or browser closes, so an investor who closes and reopens the app is asked
 * again even if the underlying Supabase session/aal2 is still technically
 * alive via a persisted refresh token — matching "every login" the way a
 * user actually experiences it, not just the literal auth-event boundary. */
export const MFA_SESSION_FLAG = 'brixton_mfa_verified_this_session'

/**
 * Gates a route subtree by role and requires an MFA-verified session (aal2)
 * for BOTH roles — mirrors auth_investor_account_id()/is_admin_verified()'s
 * aal2 requirement at the RLS layer, so the UI boundary and the database
 * boundary never disagree.
 *
 * A brand-new sign-in always starts at aal1 (Supabase never carries aal2
 * over from a previous session), so both roles naturally redo MFA on every
 * fresh login. What differs is how long a still-open session stays trusted
 * before it's asked again:
 *  - investors: only for as long as the current tab/browser stays open —
 *    the sessionStorage flag above is gone the moment it's closed, and
 *    last_mfa_verified_at predating this session's own sign-in event forces
 *    it too ("MFA every login").
 *  - admins: up to 30 days, even across one long-lived persisted session
 *    ("re-verify monthly", not "only once at setup, never again").
 */
export default function RequireRole({ role }: { role: UserRole }) {
  const { session, investorUser, loading, aal, hasMfaFactor } = useAuth()

  if (loading) return <div className="center-screen loading-state">Loading…</div>
  if (!investorUser || !investorUser.is_active) return <Navigate to="/login" replace />
  if (investorUser.invite_status === 'pending') return <Navigate to="/accept-invite" replace />
  if (investorUser.role !== role) {
    return <Navigate to={investorUser.role === 'admin' ? '/admin/properties' : '/dashboard'} replace />
  }

  if (!hasMfaFactor) return <Navigate to="/mfa-enroll" replace />
  if (aal !== 'aal2') return <Navigate to="/mfa-challenge" replace />

  const lastSignIn = session?.user.last_sign_in_at ? new Date(session.user.last_sign_in_at).getTime() : 0
  const lastVerified = investorUser.last_mfa_verified_at ? new Date(investorUser.last_mfa_verified_at).getTime() : 0
  if (lastVerified < lastSignIn) return <Navigate to="/mfa-challenge" replace />

  if (role === 'admin') {
    if (Date.now() - lastVerified > ADMIN_MFA_TRUST_MS) return <Navigate to="/mfa-challenge" replace />
  } else if (sessionStorage.getItem(MFA_SESSION_FLAG) !== '1') {
    return <Navigate to="/mfa-challenge" replace />
  }

  return <Outlet />
}
