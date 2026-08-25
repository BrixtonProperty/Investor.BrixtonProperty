import { adminClient, requireVerifiedAdmin, json, handleError, HttpError } from './_shared'

interface Body {
  investorUserId: string
  active: boolean
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    await requireVerifiedAdmin(req)
    const body = (await req.json()) as Body
    if (!body.investorUserId || typeof body.active !== 'boolean') {
      throw new HttpError(400, 'investorUserId and active are required.')
    }

    const supabase = adminClient()

    // Ban (or unban) at the Auth layer so a deactivated investor can't even
    // complete a fresh login — not just get an empty portal after RLS blocks
    // their data. ban_duration is a Postgres interval string; 'none' clears it.
    const { error: banError } = await supabase.auth.admin.updateUserById(body.investorUserId, {
      ban_duration: body.active ? 'none' : '87600h', // ~10 years
    })
    if (banError) throw new HttpError(500, banError.message)

    const { error: updateError } = await supabase
      .from('investor_users')
      .update({ is_active: body.active })
      .eq('id', body.investorUserId)
    if (updateError) throw new HttpError(500, updateError.message)

    return json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}
