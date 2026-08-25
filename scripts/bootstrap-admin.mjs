#!/usr/bin/env node
// Run ONCE, locally, after applying supabase/migrations/0001_init.sql:
//   node scripts/bootstrap-admin.mjs
//
// Creates the very first admin login (riley@brixtonproperty.co.nz) using the
// service_role key from .env.local. Never deployed — this file only ever
// runs from a developer's own machine.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'riley@brixtonproperty.co.nz'
const ADMIN_NAME = 'Riley'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnvLocal(join(__dirname, '..', '.env.local'))

function loadEnvLocal(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const appUrl = process.env.APP_URL || 'http://localhost:5173'
const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  const { data: existingRow } = await supabase.from('investor_users').select('id').eq('email', ADMIN_EMAIL).maybeSingle()
  if (existingRow) {
    console.log(`${ADMIN_EMAIL} already has an investor_users row (id ${existingRow.id}). Nothing to do.`)
    return
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: ADMIN_EMAIL,
    options: { redirectTo: `${appUrl}/accept-invite` },
  })

  if (linkError) {
    console.error('Could not generate invite link:', linkError.message)
    console.error('If this says the user already exists in auth.users, delete that auth user in the')
    console.error('Supabase Dashboard first (Authentication > Users), then re-run this script.')
    process.exit(1)
  }

  const userId = linkData.user.id
  const { error: rowError } = await supabase.from('investor_users').insert({
    id: userId,
    investor_account_id: null,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    role: 'admin',
    invite_status: 'pending',
    invite_link: linkData.properties.action_link,
    invite_generated_at: new Date().toISOString(),
  })
  if (rowError) {
    console.error('Could not create investor_users row:', rowError.message)
    process.exit(1)
  }

  console.log('\nFirst admin account created.')
  console.log(`Open this link once to set a password and enroll MFA:\n`)
  console.log(linkData.properties.action_link)
  console.log('')
}

main()
