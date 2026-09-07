-- Temporary diagnostic table: records auth state transitions observed
-- client-side (sign-in, token refresh, sign-out, aal changes) so we can see
-- hard evidence of why an admin session loses its aal2 trust unexpectedly,
-- instead of guessing. Safe to drop once the MFA-cadence bug is understood.

create table if not exists auth_event_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  session_id text,
  aal text,
  last_sign_in_at timestamptz,
  last_mfa_verified_at timestamptz,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists auth_event_log_user_created_idx on auth_event_log(user_id, created_at desc);

alter table auth_event_log enable row level security;

-- Any signed-in user can log their own client-observed auth events; no
-- UPDATE/DELETE policy for anyone -- immutable, same as audit_log.
create policy auth_event_log_insert_own on auth_event_log for insert with check (user_id = auth.uid());
create policy auth_event_log_admin_select on auth_event_log for select using (is_admin_verified());
