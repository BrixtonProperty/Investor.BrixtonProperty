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
    setHasMfaFactor((factors.data?.totp.length ?? 0) > 0)
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session) {
        await Promise.all([loadInvestorUser(data.session.user.id), loadAal()])
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        await Promise.all([loadInvestorUser(newSession.user.id), loadAal()])
      } else {
        setInvestorUser(null)
        setAal(null)
        setHasMfaFactor(false)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
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
