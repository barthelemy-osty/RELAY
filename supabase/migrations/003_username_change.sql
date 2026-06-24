alter table public.users
  add column if not exists role text not null default 'user'
  check (role in ('user', 'moderator', 'admin', 'banned'));

alter table public.users
  add column if not exists username_changed_at timestamptz;

update public.users set role = 'admin' where is_admin = true;
update public.users set role = 'banned' where is_banned = true;

alter table public.users drop column if exists is_admin;
alter table public.users drop column if exists is_banned;

drop policy if exists "users_update_own" on public.users;
drop policy if exists "users_ban" on public.users;
drop policy if exists "messages_delete" on public.messages;

create policy "users_update_own" on public.users
  for update using (
    auth.uid() = id
    and role != 'admin'
    and (
      username_changed_at is null
      or now() - username_changed_at > interval '7 days'
    )
  );

create policy "users_ban" on public.users
  for update using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('admin', 'moderator')
    )
    and (select role from public.users where id = public.users.id) != 'admin'
  );

create policy "messages_delete" on public.messages
  for delete using (
    auth.uid() = sender_id
    or exists (
      select 1 from public.users
      where id = auth.uid()
      and role in ('admin', 'moderator')
    )
  );
