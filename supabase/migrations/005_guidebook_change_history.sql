-- Bounded guidebook draft change history for collaborative editing.

CREATE TABLE IF NOT EXISTS public.guidebook_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guidebook_id uuid NOT NULL REFERENCES public.guidebooks(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text NOT NULL DEFAULT 'editor',
  action text NOT NULL,
  draft_revision integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guidebook_change_history_actor_role_check CHECK (actor_role IN ('owner', 'editor'))
);

CREATE INDEX IF NOT EXISTS idx_change_history_guidebook_created
  ON public.guidebook_change_history(guidebook_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_change_history_actor
  ON public.guidebook_change_history(actor_id);

ALTER TABLE public.guidebook_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guidebook change history: collaborators can view shared history"
  ON public.guidebook_change_history;
CREATE POLICY "Guidebook change history: collaborators can view shared history"
  ON public.guidebook_change_history
  FOR SELECT
  TO authenticated
  USING (
    guidebook_id IN (
      SELECT id
      FROM public.guidebooks
      WHERE user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.guidebook_collaborators gc
      WHERE gc.guidebook_id = guidebook_change_history.guidebook_id
        AND gc.user_id = (select auth.uid())
        AND gc.role = 'editor'
    )
  );

DROP POLICY IF EXISTS "Guidebook change history: actors and owners insert"
  ON public.guidebook_change_history;
CREATE POLICY "Guidebook change history: actors and owners insert"
  ON public.guidebook_change_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = (select auth.uid())
    AND (
      (
        actor_role = 'owner'
        AND guidebook_id IN (
          SELECT id
          FROM public.guidebooks
          WHERE user_id = (select auth.uid())
        )
      )
      OR (
        actor_role = 'editor'
        AND guidebook_id IN (
          SELECT id
          FROM public.guidebooks
          WHERE user_id = (select auth.uid())
        )
      )
      OR (
        actor_role = 'editor'
        AND EXISTS (
          SELECT 1
          FROM public.guidebook_collaborators gc
          WHERE gc.guidebook_id = guidebook_change_history.guidebook_id
            AND gc.user_id = (select auth.uid())
            AND gc.role = 'editor'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Guidebook change history: owners prune"
  ON public.guidebook_change_history;
CREATE POLICY "Guidebook change history: owners prune"
  ON public.guidebook_change_history
  FOR DELETE
  TO authenticated
  USING (
    guidebook_id IN (
      SELECT id
      FROM public.guidebooks
      WHERE user_id = (select auth.uid())
    )
  );
