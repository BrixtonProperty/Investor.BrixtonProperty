import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.types'

/**
 * Server-side only. SUPABASE_SERVICE_ROLE_KEY must be set as a Netlify env var
 * (Functions runtime), never with a VITE_ prefix — that would bundle it into
 * the client build. This client bypasses RLS, so every function here MUST
 * verify the caller is a real, MFA-verified admin before doing anything.
 */
export function adminClient() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Server misconfigured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.')
  }
  return createClient<Database>(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1]
  if (!part) return {}
  const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  return JSON.parse(json)
}

/**
 * Verifies the request carries a valid Supabase session for an active,
 * MFA-verified (aal2) admin — mirrors the is_admin_verified() RLS rule.
 * Never trusts a client-claimed role.
 */
export async function requireVerifiedAdmin(req: Request): Promise<{ userId: string }> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) throw new HttpError(401, 'Missing Authorization header.')

  const supabase = adminClient()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) throw new HttpError(401, 'Invalid or expired session.')

  const payload = decodeJwtPayload(token)
  if (payload.aal !== 'aal2') throw new HttpError(403, 'MFA verification required.')

  const { data: profile, error: profileError } = await supabase
    .from('investor_users')
    .select('role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (profileError || !profile || profile.role !== 'admin' || !profile.is_active) {
    throw new HttpError(403, 'Admin access required.')
  }

  return { userId: userData.user.id }
}

/**
 * Resolves the app's public origin for building invite/redirect links.
 * Priority: explicit APP_URL env var (set this once you know your final
 * domain) > the Host the browser actually used to call this function
 * (works for the .netlify.app URL, a custom domain, or a deploy preview,
 * with zero config) > Netlify's own URL var > localhost for local dev.
 * IMPORTANT: whatever this resolves to MUST also be on Supabase's Auth ->
 * URL Configuration -> Redirect URLs allowlist, or Supabase will silently
 * substitute its own default Site URL instead of erroring.
 */
export function resolveAppUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (host) return `${proto}://${host}`
  if (process.env.URL) return process.env.URL
  return 'http://localhost:5173'
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export function handleError(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message }, err.status)
  console.error(err)
  return json({ error: 'Internal server error.' }, 500)
}
