import { adminClient, requireVerifiedAdmin, json, handleError, HttpError } from './_shared'

interface Body {
  investorUserId: string
}

/** Permanently removes a login: deletes the auth.users row (which cascades
 * to investor_users via its FK), not just the investor_users row on its
 * own -- deleting only the table row through Supabase's Table Editor (or
 * any other direct route) leaves an orphaned auth identity behind that
 * then blocks re-inviting the same email with "already registered". */
export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const { userId: callerId } = await requireVerifiedAdmin(req)
    const body = (await req.json()) as Body
    if (!body.investorUserId) throw new HttpError(400, 'investorUserId is required.')
    if (body.investorUserId === callerId) throw new HttpError(400, "You can't delete your own login.")

    const supabase = adminClient()
    const { error } = await supabase.auth.admin.deleteUser(body.investorUserId)
    if (error) throw new HttpError(500, error.message)

    return json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}
