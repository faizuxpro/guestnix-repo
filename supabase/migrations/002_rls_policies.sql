-- Row-Level Security policies for Guestnix
-- This script enables RLS on the public tables and creates explicit policies
-- compatible with the current schema.

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidebook_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidebook_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidebook_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidebook_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Profiles: users can manage their own profile
CREATE POLICY "Profiles: owner only" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Properties: users can manage their own properties
CREATE POLICY "Properties: owner only" ON public.properties
  FOR ALL USING (auth.uid() = user_id);

-- Guidebooks: owners can manage their guidebooks; public can read published content
CREATE POLICY "Guidebooks: owners can manage own guidebooks" ON public.guidebooks
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Guidebooks: public can view published guidebooks" ON public.guidebooks
  FOR SELECT USING (status = 'published');

-- Sections: owners manage their sections; published sections are public read-only
CREATE POLICY "Guidebook sections: owners can manage own sections" ON public.guidebook_sections
  FOR ALL USING (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
  );
CREATE POLICY "Guidebook sections: public can view published sections" ON public.guidebook_sections
  FOR SELECT USING (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE status = 'published')
  );

-- Blocks: owners manage their blocks; published blocks are public read-only
CREATE POLICY "Guidebook blocks: owners can manage own blocks" ON public.guidebook_blocks
  FOR ALL USING (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
  );
CREATE POLICY "Guidebook blocks: public can view published blocks" ON public.guidebook_blocks
  FOR SELECT USING (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE status = 'published')
  );

-- Places: owners manage their places; published places are public read-only
CREATE POLICY "Guidebook places: owners can manage own places" ON public.guidebook_places
  FOR ALL USING (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
  );
CREATE POLICY "Guidebook places: public can view published places" ON public.guidebook_places
  FOR SELECT USING (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE status = 'published')
  );

-- Publications: only owners can manage publication snapshots
CREATE POLICY "Guidebook publications: owners can manage own publications" ON public.guidebook_publications
  FOR ALL USING (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
  );

-- Chat sessions: anyone may create a new session for a published guidebook; hosts can manage their own sessions
CREATE POLICY "Chat sessions: public can create sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE status = 'published')
  );
CREATE POLICY "Chat sessions: owners can manage own sessions" ON public.chat_sessions
  FOR ALL USING (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
  );

-- Chat messages: only hosts may manage messages through authenticated access
CREATE POLICY "Chat messages: owners can manage messages for own sessions" ON public.chat_messages
  FOR ALL USING (
    session_id IN (
      SELECT id FROM public.chat_sessions
      WHERE guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
    )
  );

-- Chat usage: host-owned usage rows only
CREATE POLICY "Chat usage: owner only" ON public.chat_usage
  FOR ALL USING (auth.uid() = user_id);

-- Analytics: anyone can insert events; owners can read events for their guidebooks
CREATE POLICY "Analytics events: public can insert" ON public.analytics_events
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Analytics events: owners can read own guidebook events" ON public.analytics_events
  FOR SELECT USING (
    guidebook_id IN (SELECT id FROM public.guidebooks WHERE user_id = auth.uid())
  );

-- Subscriptions: users can view/manage their own subscriptions
CREATE POLICY "Subscriptions: owner only" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Custom domains: users can manage their own domains
CREATE POLICY "Custom domains: owner only" ON public.custom_domains
  FOR ALL USING (auth.uid() = user_id);

-- Templates: public read access for rendering template previews
CREATE POLICY "Templates: public read access" ON public.templates
  FOR SELECT USING (TRUE);
