-- TÂCHE 3 : Système d'abonnement

CREATE TYPE public.subscription_plan   AS ENUM ('free', 'pro');
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');

CREATE TABLE public.subscriptions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan                   public.subscription_plan   NOT NULL DEFAULT 'free',
  status                 public.subscription_status NOT NULL DEFAULT 'active',
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Insérer un abonnement free automatiquement à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_subscription
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_subscription();

-- Fonction get_user_plan(user_id)
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT plan::text FROM public.subscriptions
     WHERE user_id = p_user_id
       AND status IN ('active', 'trialing')
       AND (current_period_end IS NULL OR current_period_end > now())
    ),
    'free'
  );
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
