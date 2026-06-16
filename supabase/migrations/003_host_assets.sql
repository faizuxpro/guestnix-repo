-- Host-level reusable assets for Assets Hub.

CREATE TABLE IF NOT EXISTS public.host_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  name text NOT NULL,
  description text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_url text,
  file_name text,
  mime_type text,
  file_size integer,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_host_assets_user_id
  ON public.host_assets(user_id);

CREATE INDEX IF NOT EXISTS idx_host_assets_user_type
  ON public.host_assets(user_id, asset_type);

CREATE INDEX IF NOT EXISTS idx_host_assets_updated
  ON public.host_assets(updated_at);

ALTER TABLE public.host_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Host assets: owner only" ON public.host_assets;
CREATE POLICY "Host assets: owner only" ON public.host_assets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
