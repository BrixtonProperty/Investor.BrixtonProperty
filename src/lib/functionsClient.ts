import { supabase } from './supabaseClient'

/** Calls a Netlify Function under /.netlify/functions/, attaching the caller's access token
 * so the function can verify (server-side, via the service_role key) that the caller is a
 * real admin before doing anything privileged. Never trust a client-claimed role. */
export async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Not signed in.')

  const res = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`)
  }
  return json as T
}
