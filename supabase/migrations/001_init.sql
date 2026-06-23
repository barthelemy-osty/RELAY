-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── USERS ───────────────────────────────────────────────────────────────────
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  username        text not null unique,
  avatar_url      text,
  bio             text,
  public_key      text not null,
  key_fingerprint text not null,
  is_admin        boolean not null default false,
  is_banned       boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_select" on public.users
  for select using (auth.uid() is not null);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

-- ─── BANNED USERS ────────────────────────────────────────────────────────────
create table public.banned_users (
  id             uuid primary key default gen_random_uuid(),
  banned_user_id uuid not null references public.users(id) on delete cascade,
  banned_by      uuid not null references public.users(id),
  reason         text,
  banned_at      timestamptz not null default now(),
  unique (banned_user_id)
);

alter table public.banned_users enable row level security;

create policy "banned_admin_only" on public.banned_users
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- ─── CONVERSATIONS ───────────────────────────────────────────────────────────
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  description text,
  avatar_url  text,
  is_group    boolean not null default false,
  created_by  uuid not null references public.users(id),
  created_at  timestamptz not null default now()
);

alter table public.conversations enable row level security;

-- ─── CONVERSATION PARTICIPANTS ────────────────────────────────────────────────
-- Créée AVANT les policies de conversations qui y font référence
create table public.conversation_participants (
  conversation_id     uuid not null references public.conversations(id) on delete cascade,
  user_id             uuid not null references public.users(id) on delete cascade,
  role                text not null default 'member' check (role in ('owner', 'admin', 'member')),
  encrypted_group_key text,
  group_key_nonce     text,
  joined_at           timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

-- ─── POLICIES CONVERSATIONS (après création de participants) ──────────────────
create policy "conversations_select" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = conversations.id
        and user_id = auth.uid()
    )
  );

create policy "conversations_insert" on public.conversations
  for insert with check (auth.uid() = created_by);

-- ─── POLICIES PARTICIPANTS ────────────────────────────────────────────────────
create policy "participants_select" on public.conversation_participants
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
    )
  );

create policy "participants_insert" on public.conversation_participants
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
        and cp.role in ('owner', 'admin')
    )
  );

create policy "participants_delete" on public.conversation_participants
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
        and cp.role in ('owner', 'admin')
    )
  );

create policy "participants_update" on public.conversation_participants
  for update using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
        and cp.role = 'owner'
    )
  );

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.users(id),
  ciphertext      text not null,
  nonce           text not null,
  reply_to_id     uuid references public.messages(id),
  edited_at       timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id
        and user_id = auth.uid()
    )
  );

create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id
        and user_id = auth.uid()
    )
    and not exists (
      select 1 from public.users
      where id = auth.uid() and is_banned = true
    )
  );

-- ─── REALTIME ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_participants;

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
create index messages_conversation_id_idx on public.messages(conversation_id, created_at desc);
create index participants_user_id_idx on public.conversation_participants(user_id);
create index users_username_idx on public.users(username);-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── USERS ───────────────────────────────────────────────────────────────────
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  username        text not null unique,
  avatar_url      text,
  bio             text,
  public_key      text not null,
  key_fingerprint text not null,
  is_admin        boolean not null default false,
  is_banned       boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_select" on public.users
  for select using (auth.uid() is not null);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

-- ─── BANNED USERS ────────────────────────────────────────────────────────────
create table public.banned_users (
  id             uuid primary key default gen_random_uuid(),
  banned_user_id uuid not null references public.users(id) on delete cascade,
  banned_by      uuid not null references public.users(id),
  reason         text,
  banned_at      timestamptz not null default now(),
  unique (banned_user_id)
);

alter table public.banned_users enable row level security;

create policy "banned_admin_only" on public.banned_users
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- ─── CONVERSATIONS ───────────────────────────────────────────────────────────
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  description text,
  avatar_url  text,
  is_group    boolean not null default false,
  created_by  uuid not null references public.users(id),
  created_at  timestamptz not null default now()
);

alter table public.conversations enable row level security;

-- ─── CONVERSATION PARTICIPANTS ────────────────────────────────────────────────
-- Créée AVANT les policies de conversations qui y font référence
create table public.conversation_participants (
  conversation_id     uuid not null references public.conversations(id) on delete cascade,
  user_id             uuid not null references public.users(id) on delete cascade,
  role                text not null default 'member' check (role in ('owner', 'admin', 'member')),
  encrypted_group_key text,
  group_key_nonce     text,
  joined_at           timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

-- ─── POLICIES CONVERSATIONS (après création de participants) ──────────────────
create policy "conversations_select" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = conversations.id
        and user_id = auth.uid()
    )
  );

create policy "conversations_insert" on public.conversations
  for insert with check (auth.uid() = created_by);

-- ─── POLICIES PARTICIPANTS ────────────────────────────────────────────────────
create policy "participants_select" on public.conversation_participants
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
    )
  );

create policy "participants_insert" on public.conversation_participants
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
        and cp.role in ('owner', 'admin')
    )
  );

create policy "participants_delete" on public.conversation_participants
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
        and cp.role in ('owner', 'admin')
    )
  );

create policy "participants_update" on public.conversation_participants
  for update using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
        and cp.role = 'owner'
    )
  );

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.users(id),
  ciphertext      text not null,
  nonce           text not null,
  reply_to_id     uuid references public.messages(id),
  edited_at       timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id
        and user_id = auth.uid()
    )
  );

create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id
        and user_id = auth.uid()
    )
    and not exists (
      select 1 from public.users
      where id = auth.uid() and is_banned = true
    )
  );

-- ─── REALTIME ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_participants;

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
create index messages_conversation_id_idx on public.messages(conversation_id, created_at desc);
create index participants_user_id_idx on public.conversation_participants(user_id);
create index users_username_idx on public.users(username);
