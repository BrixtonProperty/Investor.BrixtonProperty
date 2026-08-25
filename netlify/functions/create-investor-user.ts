import { adminClient, requireVerifiedAdmin, json, handleError, HttpError } from './_shared'

interface Body {
  name: string
  email: string
  investorAccountId?: string
  newAccountDisplayName?: string
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    await requireVerifiedAdmin(req)
    const body = (await req.json()) as Body
    if (!body.name || !body.email) throw new HttpError(400, 'name and email are required.')
    if (!body.investorAccountId && !body.newAccountDisplayName) {
      throw new HttpError(400, 'Provide either investorAccountId or newAccountDisplayName.')
    }

    const supabase = adminClient()

    let investorAccountId = body.investorAccountId
    if (!investorAccountId) {
      const { data: account, error: accountError } = await supabase
        .from('investor_accounts')
        .insert({ display_name: body.newAccountDisplayName! })
        .select('id')
        .single()
      if (accountError || !account) throw new HttpError(500, accountError?.message ?? 'Could not create investor account.')
      investorAccountId = account.id
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      email_confirm: false,
    })
    if (createError || !created.user) throw new HttpError(400, createError?.message ?? 'Could not create login.')

    const appUrl = process.env.APP_URL || process.env.URL || 'http://localhost:5173'
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: body.email,
      options: { redirectTo: `${appUrl}/accept-invite` },
    })
    if (linkError || !linkData) throw new HttpError(500, linkError?.message ?? 'Could not generate invite link.')

    const { error: rowError } = await supabase.from('investor_users').insert({
      id: created.user.id,
      investor_account_id: investorAccountId,
      name: body.name,
      email: body.email,
      role: 'investor',
      invite_status: 'pending',
      invite_link: linkData.properties.action_link,
      invite_generated_at: new Date().toISOString(),
    })
    if (rowError) throw new HttpError(500, rowError.message)

    return json({
      investorAccountId,
      investorUserId: created.user.id,
      inviteLink: linkData.properties.action_link,
    })
  } catch (err) {
    return handleError(err)
  }
}
