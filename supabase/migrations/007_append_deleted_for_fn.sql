-- Fonction RPC pour supprimer un message pour soi de façon atomique
CREATE OR REPLACE FUNCTION public.append_deleted_for(p_message_id uuid, p_user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.messages
  SET deleted_for = array_append(deleted_for, p_user_id)
  WHERE id = p_message_id
    AND NOT (p_user_id = ANY(deleted_for));
$$;
