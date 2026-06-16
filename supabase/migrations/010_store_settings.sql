-- Host-level Store settings shared across guidebooks.

CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_instructions text,
  payment_methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_settings_unique_user UNIQUE (user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_settings_user
  ON public.store_settings(user_id);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store settings: owner only" ON public.store_settings;
CREATE POLICY "Store settings: owner only" ON public.store_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.guidebook_storefronts
  ADD COLUMN IF NOT EXISTS payment_method_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  DROP COLUMN IF EXISTS payment_instructions,
  DROP COLUMN IF EXISTS fulfillment_instructions,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS intro;
