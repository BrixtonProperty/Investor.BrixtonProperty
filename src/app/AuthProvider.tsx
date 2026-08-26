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
    console.log('[auth] effect start, mounted=', mounted)

    async function applySession(newSession: Session | null, source: string) {
      console.log('[auth] applySession from', source, 'session?', !!newSession, 'mounted?', mounted)
      if (!mounted) return
      setSession(newSession)
      if (newSession) {
        try {
          await Promise.all([loadInvestorUser(newSession.user.id), loadAal()])
          console.log('[auth] loadInvestorUser/loadAal completed for', source)
        } catch (err) {
          console.log('[auth] loadInvestorUser/loadAal threw for', source, err)
        }
      } else {
        setInvestorUser(null)
        setAal(null)
        setHasMfaFactor(false)
      }
      if (!mounted) {
        console.log('[auth] unmounted before setLoading(false), source=', source)
        return
      }
      resolvedOnce = true
      console.log('[auth] setLoading(false) from', source)
      setLoading(false)
    }

    console.log('[auth] calling getSession()')
    supabase.auth
      .getSession()
      .then(({ data }) => {
        console.log('[auth] getSession() resolved, session?', !!data.session)
        applySession(data.session, 'getSession')
      })
      .catch((err) => console.log('[auth] getSession() rejected', err))

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[auth] onAuthStateChange fired, event=', event, 'session?', !!newSession)
      applySession(newSession, 'onAuthStateChange:' + event)
    })

    const timeout = setTimeout(() => {
      console.log('[auth] timeout fired, mounted=', mounted, 'resolvedOnce=', resolvedOnce)
      if (mounted && !resolvedOnce) setLoading(false)
    }, 4000)

    return () => {
      console.log('[auth] cleanup running, was mounted=', mounted)
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
