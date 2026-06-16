-- Guidebook-level collaborators, invitations, ownership transfer requests,
-- and draft conflict metadata.

ALTER TABLE public.guidebooks
  ADD COLUMN IF NOT EXISTS draft_revision integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.guidebook_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guidebook_id uuid NOT NULL REFERENCES public.guidebooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor',
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guidebook_collaborators_role_check CHECK (role IN ('editor')),
  CONSTRAINT guidebook_collaborators_unique_user UNIQUE (guidebook_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_user
  ON public.guidebook_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_collaborators_guidebook
  ON public.guidebook_collaborators(guidebook_id);

CREATE TABLE IF NOT EXISTS public.guidebook_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guidebook_id uuid NOT NULL REFERENCES public.guidebooks(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guidebook_invitations_role_check CHECK (role IN ('editor')),
  CONSTRAINT guidebook_invitations_status_check CHECK (status IN ('pending', 'accepted', 'revoked', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_invitations_guidebook
  ON public.guidebook_invitations(guidebook_id);

CREATE INDEX IF NOT EXISTS idx_invitations_email
  ON public.guidebook_invitations(lower(email));

CREATE INDEX IF NOT EXISTS idx_invitations_status
  ON public.guidebook_invitations(status);

CREATE TABLE IF NOT EXISTS public.guidebook_ownership_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guidebook_id uuid NOT NULL REFERENCES public.guidebooks(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  keep_previous_owner_as_editor boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guidebook_ownership_transfers_status_check CHECK (status IN ('pending', 'accepted', 'canceled', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_ownership_transfers_guidebook
  ON public.guidebook_ownership_transfers(guidebook_id);

CREATE INDEX IF NOT EXISTS idx_ownership_transfers_to_user
  ON public.guidebook_ownership_transfers(to_user_id);

CREATE INDEX IF NOT EXISTS idx_ownership_transfers_status
  ON public.guidebook_ownership_transfers(status);

ALTER TABLE public.guidebook_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidebook_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidebook_ownership_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guidebooks: collaborators can view shared guidebooks" ON public.guidebooks;
CREATE POLICY "Guidebooks: collaborators can view shared guidebooks" ON public.guidebooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.guidebook_collaborators gc
      WHERE gc.guidebook_id = guidebooks.id
        AND gc.user_id = auth.uid()
        AND gc.role = 'editor'
    )
  );

DROP POLICY IF EXISTS "Guidebook sections: collaborators can edit shared sections" ON public.guidebook_sections;
DROP POLICY IF EXISTS "Guidebook sections: collaborators can view shared sections" ON public.guidebook_sections;
CREATE POLICY "Guidebook sections: collaborators can view shared sections" ON public.guidebook_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.guidebook_collaborators gc
      WHERE gc.guidebook_id = guidebook_sections.guidebook_id
        AND gc.user_id = auth.uid()
        AND gc.role = 'editor'
    )
  );

DROP POLICY IF EXISTS "Guidebook blocks: collaborators can edit shared blocks" ON public.guidebook_blocks;
DROP POLICY IF EXISTS "Guidebook blocks: collaborators can view shared blocks" ON public.guidebook_blocks;
CREATE POLICY "Guidebook blocks: collaborators can view shared blocks" ON public.guidebook_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.guidebook_collaborators gc
      WHERE gc.guidebook_id = guidebook_blocks.guidebook_id
        AND gc.user_id = auth.uid()
        AND gc.role = 'editor'
    )
  );

DROP POLICY IF EXISTS "Guidebook places: collaborators can edit shared places" ON public.guidebook_places;
DROP POLICY IF EXISTS "Guidebook places: collaborators can view shared places" ON public.guidebook_places;
CREATE POLICY "Guidebook places: collaborators can view shared places" ON public.guidebook_places
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.guidebook_collaborators gc
      WHERE gc.guidebook_id = guidebook_places.guidebook_id
        AND gc.user_id = auth.uid()
        AND gc.role = 'editor'
    )
  );

DROP POLICY IF EXISTS "Guidebook collaborators: owner manages and users view self" ON public.guidebook_collaborators;
CREATE POLICY "Guidebook collaborators: owner manages and users view self" ON public.guidebook_collaborators
  FOR ALL USING (
    user_id = auth.uid()
    OR guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
  )
  WITH CHECK (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Guidebook invitations: owner manages and invitee views" ON public.guidebook_invitations;
CREATE POLICY "Guidebook invitations: owner manages and invitee views" ON public.guidebook_invitations
  FOR ALL USING (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
    OR lower(email) IN (SELECT lower(email) FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Guidebook ownership transfers: participants only" ON public.guidebook_ownership_transfers;
CREATE POLICY "Guidebook ownership transfers: participants only" ON public.guidebook_ownership_transfers
  FOR ALL USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
  )
  WITH CHECK (
    from_user_id = auth.uid()
    AND guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_guidebook_collaborators_updated_at ON public.guidebook_collaborators;
CREATE TRIGGER update_guidebook_collaborators_updated_at
  BEFORE UPDATE ON public.guidebook_collaborators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_guidebook_invitations_updated_at ON public.guidebook_invitations;
CREATE TRIGGER update_guidebook_invitations_updated_at
  BEFORE UPDATE ON public.guidebook_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_guidebook_ownership_transfers_updated_at ON public.guidebook_ownership_transfers;
CREATE TRIGGER update_guidebook_ownership_transfers_updated_at
  BEFORE UPDATE ON public.guidebook_ownership_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
