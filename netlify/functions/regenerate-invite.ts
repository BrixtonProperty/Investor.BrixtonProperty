import { adminClient, requireVerifiedAdmin, json, handleError, HttpError } from './_shared'

interface Body {
  investorUserId: string
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    await requireVerifiedAdmin(req)
    const body = (await req.json()) as Body
    if (!body.investorUserId) throw new HttpError(400, 'investorUserId is required.')

    const supabase = adminClient()
    const { data: target, error: targetError } = await supabase
      .from('investor_users')
      .select('email')
      .eq('id', body.investorUserId)
      .single()
    if (targetError || !target) throw new HttpError(404, 'Investor user not found.')

    const appUrl = process.env.APP_URL || process.env.URL || 'http://localhost:5173'
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: target.email,
      options: { redirectTo: `${appUrl}/accept-invite` },
    })
    if (linkError || !linkData) throw new HttpError(500, linkError?.message ?? 'Could not generate invite link.')

    const { error: updateError } = await supabase
      .from('investor_users')
      .update({ invite_link: linkData.properties.action_link, invite_generated_at: new Date().toISOString() })
      .eq('id', body.investorUserId)
    if (updateError) throw new HttpError(500, updateError.message)

    return json({ inviteLink: linkData.properties.action_link })
  } catch (err) {
    return handleError(err)
  }
}
