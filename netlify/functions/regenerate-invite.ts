import { adminClient, requireVerifiedAdmin, resolveAppUrl, json, handleError, HttpError } from './_shared'

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

    // 'magiclink', not 'invite' — the user already exists at this point (this
    // is a resend), and generateLink(type:'invite') only works for brand-new
    // users; it fails with "email_exists" otherwise. Verifying a magiclink
    // still lands them on /accept-invite to set a password, same as invite.
    const appUrl = resolveAppUrl(req)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: target.email,
      options: { redirectTo: `${appUrl}/accept-invite` },
    })
    if (linkError || !linkData) throw new HttpError(500, linkError?.message ?? 'Could not generate invite link.')

    // See create-investor-user.ts for why this is our own URL + token_hash
    // rather than Supabase's action_link -- avoids the token being silently
    // burned by email link-preview scanners before the real click.
    const inviteLink = `${appUrl}/accept-invite?token_hash=${linkData.properties.hashed_token}&type=magiclink`

    const { error: updateError } = await supabase
      .from('investor_users')
      .update({ invite_link: inviteLink, invite_generated_at: new Date().toISOString() })
      .eq('id', body.investorUserId)
    if (updateError) throw new HttpError(500, updateError.message)

    return json({ inviteLink })
  } catch (err) {
    return handleError(err)
  }
}
