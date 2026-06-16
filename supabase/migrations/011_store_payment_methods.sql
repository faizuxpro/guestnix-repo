-- Structured host payment methods and per-guidebook Store selections.

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS payment_methods jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.guidebook_storefronts
  ADD COLUMN IF NOT EXISTS payment_method_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS intro;
