-- Dashboard announcement banner campaigns, recipients, and interaction events.

CREATE TABLE IF NOT EXISTS public.announcement_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  priority integer NOT NULL DEFAULT 20,
  tone text NOT NULL DEFAULT 'info',
  display_mode text NOT NULL DEFAULT 'standard',
  icon text NOT NULL DEFAULT 'megaphone',
  cta_label text,
  cta_href text,
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  behavior_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_campaigns_status_window
  ON public.announcement_campaigns(status, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_announcement_campaigns_created
  ON public.announcement_campaigns(created_at);

CREATE TABLE IF NOT EXISTS public.announcement_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.announcement_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'pending',
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  dismissed_at timestamptz,
  acknowledged_at timestamptz,
  snoozed_until timestamptz,
  clicked_at timestamptz,
  expanded_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_recipients_campaign_user
  ON public.announcement_recipients(campaign_id, user_id);

CREATE INDEX IF NOT EXISTS idx_announcement_recipients_user_state
  ON public.announcement_recipients(user_id, state);

CREATE INDEX IF NOT EXISTS idx_announcement_recipients_campaign
  ON public.announcement_recipients(campaign_id);

CREATE TABLE IF NOT EXISTS public.announcement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.announcement_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_events_campaign_created
  ON public.announcement_events(campaign_id, created_at);

CREATE INDEX IF NOT EXISTS idx_announcement_events_user_created
  ON public.announcement_events(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_announcement_events_type
  ON public.announcement_events(event_type);

ALTER TABLE public.announcement_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Announcement campaigns: recipient read" ON public.announcement_campaigns;
CREATE POLICY "Announcement campaigns: recipient read" ON public.announcement_campaigns
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.announcement_recipients
      WHERE announcement_recipients.campaign_id = announcement_campaigns.id
        AND announcement_recipients.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Announcement recipients: owner read" ON public.announcement_recipients;
CREATE POLICY "Announcement recipients: owner read" ON public.announcement_recipients
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Announcement events: owner read" ON public.announcement_events;
CREATE POLICY "Announcement events: owner read" ON public.announcement_events
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_announcement_campaigns_updated_at ON public.announcement_campaigns;
CREATE TRIGGER update_announcement_campaigns_updated_at
  BEFORE UPDATE ON public.announcement_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_announcement_recipients_updated_at ON public.announcement_recipients;
CREATE TRIGGER update_announcement_recipients_updated_at
  BEFORE UPDATE ON public.announcement_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
