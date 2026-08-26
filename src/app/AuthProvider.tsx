import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { InvestorUser } from '../types/database.types'

interface AuthState {
  session: Session | null
  investorUser: InvestorUser | null
  loading: boolean
  /** 'aal1' = password-only, 'aal2' = MFA-verified this session */
  aal: 'aal1' | 'aal2' | null
  hasMfaFactor: boolean
  refreshInvestorUser: () => Promise<void>
  refreshAal: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [investorUser, setInvestorUser] = useState<InvestorUser | null>(null)
  const [aal, setAal] = useState<'aal1' | 'aal2' | null>(null)
  const [hasMfaFactor, setHasMfaFactor] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadInvestorUser(userId: string) {
    const { data } = await supabase.from('investor_users').select('*').eq('id', userId).maybeSingle()
    setInvestorUser(data ?? null)
  }

  async function loadAal() {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setAal((data?.currentLevel as 'aal1' | 'aal2') ?? 'aal1')
    const factors = await supabase.auth.mfa.listFactors()
    setHasMfaFactor((factors.data?.totp.length ?? 0) > 0) // .totp only ever contains verified factors
  }

  useEffect(() => {
    let mounted = true
    let resolvedOnce = false

    async function applySession(newSession: Session | null) {
      if (!mounted) return
      setSession(newSession)
      if (newSession) {
        try {
          await Promise.all([loadInvestorUser(newSession.user.id), loadAal()])
        } catch {
          // don't let a transient profile/MFA lookup failure block auth resolution
        }
      } else {
        setInvestorUser(null)
        setAal(null)
        setHasMfaFactor(false)
      }
      if (!mounted) return
      resolvedOnce = true
      setLoading(false)
    }

    // Primary path: on mount, whatever session (if any) is already
    // established -- including one just detected from an invite/magic-link
    // URL fragment.
    supabase.auth.getSession().then(({ data }) => applySession(data.session))

    // Also resolves loading from here: getSession()'s own promise has a
    // known race against the URL-based session-detection that runs on
    // client init (e.g. an /accept-invite or /admin/portfolio landing from
    // a fresh invite link), where getSession() can be left pending. This
    // listener fires independently, so `loading` still clears even if that
    // happens -- otherwise the page is stuck on "Loading..." forever and a
    // refresh drops the still-unconsumed hash, landing back on /login.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySession(newSession)
    })

    // Last-resort safety net: never leave the app stuck on a loading
    // screen indefinitely, regardless of the cause.
    const timeout = setTimeout(() => {
      if (mounted && !resolvedOnce) setLoading(false)
    }, 4000)

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const value: AuthState = {
    session,
    investorUser,
    loading,
    aal,
    hasMfaFactor,
    refreshInvestorUser: async () => {
      if (session) await loadInvestorUser(session.user.id)
    },
    refreshAal: loadAal,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
