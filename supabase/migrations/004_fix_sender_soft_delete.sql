ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE public.messages
  ALTER COLUMN sender_id DROP NOT NULL;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Soft delete sur la table users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_deleted  boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

-- 3. Index pour filtrer les comptes actifs
CREATE INDEX IF NOT EXISTS users_is_deleted_idx
  ON public.users(is_deleted) WHERE is_deleted = false;
