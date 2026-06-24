alter table public.users
  add column if not exists username_changed_at timestamptz;

create policy "users_update_username" on public.users
  for update using (
    auth.uid() = id
    and (
      username_changed_at is null
      or now() - username_changed_at > interval '7 days'
    )
  );
