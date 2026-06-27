-- TÂCHE 4 : Fonctionnalités squelette

-- 4a. Statut de livraison des messages
CREATE TYPE public.message_status AS ENUM ('sent', 'delivered', 'read');

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS status          public.message_status NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS deleted_for_all boolean               NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_for     uuid[]                NOT NULL DEFAULT '{}';

-- Policy update pour le statut
CREATE POLICY "messages_update_status" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- 4b. Réactions emoji
CREATE TABLE public.message_reactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  emoji      text        NOT NULL CHECK (char_length(emoji) <= 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "reactions_insert" ON public.message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_delete" ON public.message_reactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX message_reactions_message_idx
  ON public.message_reactions(message_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- 4c. Profil enrichi
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status_text text,
  ADD COLUMN IF NOT EXISTS last_seen   timestamptz;
