-- Launch v1 security hardening:
-- enable Row Level Security on every table in the exposed public schema and
-- keep raw Supabase API access limited to authenticated owners/collaborators.

alter table public.admin_billing_audit_logs enable row level security;
alter table public.analytics_events enable row level security;
alter table public.announcement_campaigns enable row level security;
alter table public.announcement_events enable row level security;
alter table public.announcement_recipients enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_usage enable row level security;
alter table public.coupons enable row level security;
alter table public.custom_domains enable row level security;
alter table public.guidebook_blocks enable row level security;
alter table public.guidebook_change_history enable row level security;
alter table public.guidebook_collaborators enable row level security;
alter table public.guidebook_invitations enable row level security;
alter table public.guidebook_ownership_transfers enable row level security;
alter table public.guidebook_places enable row level security;
alter table public.guidebook_publications enable row level security;
alter table public.guidebook_sections enable row level security;
alter table public.guidebook_storefront_items enable row level security;
alter table public.guidebook_storefronts enable row level security;
alter table public.guidebooks enable row level security;
alter table public.host_assets enable row level security;
alter table public.notifications enable row level security;
alter table public.payments enable row level security;
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.store_items enable row level security;
alter table public.store_request_items enable row level security;
alter table public.store_request_messages enable row level security;
alter table public.store_requests enable row level security;
alter table public.store_settings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.templates enable row level security;

drop policy if exists "Profiles: owner only" on public.profiles;
create policy "Profiles: owner only" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Properties: owner only" on public.properties;
create policy "Properties: owner only" on public.properties
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Guidebooks: owners can manage own guidebooks" on public.guidebooks;
create policy "Guidebooks: owners can manage own guidebooks" on public.guidebooks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Guidebooks: public can view published guidebooks" on public.guidebooks;
drop policy if exists "Guidebooks: collaborators can view shared guidebooks" on public.guidebooks;
create policy "Guidebooks: collaborators can view shared guidebooks" on public.guidebooks
  for select to authenticated
  using (
    exists (
      select 1
      from public.guidebook_collaborators gc
      where gc.guidebook_id = guidebooks.id
        and gc.user_id = (select auth.uid())
        and gc.role = 'editor'
    )
  );

drop policy if exists "Guidebook sections: owners can manage own sections" on public.guidebook_sections;
create policy "Guidebook sections: owners can manage own sections" on public.guidebook_sections
  for all to authenticated
  using (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  )
  with check (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  );

drop policy if exists "Guidebook sections: public can view published sections" on public.guidebook_sections;
drop policy if exists "Guidebook sections: collaborators can edit shared sections" on public.guidebook_sections;
drop policy if exists "Guidebook sections: collaborators can view shared sections" on public.guidebook_sections;
create policy "Guidebook sections: collaborators can view shared sections" on public.guidebook_sections
  for select to authenticated
  using (
    exists (
      select 1
      from public.guidebook_collaborators gc
      where gc.guidebook_id = guidebook_sections.guidebook_id
        and gc.user_id = (select auth.uid())
        and gc.role = 'editor'
    )
  );

drop policy if exists "Guidebook blocks: owners can manage own blocks" on public.guidebook_blocks;
create policy "Guidebook blocks: owners can manage own blocks" on public.guidebook_blocks
  for all to authenticated
  using (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  )
  with check (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  );

drop policy if exists "Guidebook blocks: public can view published blocks" on public.guidebook_blocks;
drop policy if exists "Guidebook blocks: collaborators can edit shared blocks" on public.guidebook_blocks;
drop policy if exists "Guidebook blocks: collaborators can view shared blocks" on public.guidebook_blocks;
create policy "Guidebook blocks: collaborators can view shared blocks" on public.guidebook_blocks
  for select to authenticated
  using (
    exists (
      select 1
      from public.guidebook_collaborators gc
      where gc.guidebook_id = guidebook_blocks.guidebook_id
        and gc.user_id = (select auth.uid())
        and gc.role = 'editor'
    )
  );

drop policy if exists "Guidebook places: owners can manage own places" on public.guidebook_places;
create policy "Guidebook places: owners can manage own places" on public.guidebook_places
  for all to authenticated
  using (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  )
  with check (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  );

drop policy if exists "Guidebook places: public can view published places" on public.guidebook_places;
drop policy if exists "Guidebook places: collaborators can edit shared places" on public.guidebook_places;
drop policy if exists "Guidebook places: collaborators can view shared places" on public.guidebook_places;
create policy "Guidebook places: collaborators can view shared places" on public.guidebook_places
  for select to authenticated
  using (
    exists (
      select 1
      from public.guidebook_collaborators gc
      where gc.guidebook_id = guidebook_places.guidebook_id
        and gc.user_id = (select auth.uid())
        and gc.role = 'editor'
    )
  );

drop policy if exists "Guidebook publications: owners can manage own publications" on public.guidebook_publications;
create policy "Guidebook publications: owners can manage own publications" on public.guidebook_publications
  for all to authenticated
  using (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  )
  with check (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  );

drop policy if exists "Guidebook collaborators: owner manages and users view self" on public.guidebook_collaborators;
create policy "Guidebook collaborators: owner manages and users view self" on public.guidebook_collaborators
  for all to authenticated
  using (
    user_id = (select auth.uid())
    or guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  )
  with check (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  );

drop policy if exists "Guidebook invitations: owner manages and invitee views" on public.guidebook_invitations;
create policy "Guidebook invitations: owner manages and invitee views" on public.guidebook_invitations
  for all to authenticated
  using (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
    or lower(email) in (
      select lower(email) from public.profiles where id = (select auth.uid())
    )
  )
  with check (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  );

drop policy if exists "Guidebook ownership transfers: participants only" on public.guidebook_ownership_transfers;
create policy "Guidebook ownership transfers: participants only" on public.guidebook_ownership_transfers
  for all to authenticated
  using (
    from_user_id = (select auth.uid())
    or to_user_id = (select auth.uid())
  )
  with check (
    from_user_id = (select auth.uid())
    and guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  );

drop policy if exists "Guidebook change history: collaborators can view shared history" on public.guidebook_change_history;
create policy "Guidebook change history: collaborators can view shared history"
  on public.guidebook_change_history
  for select to authenticated
  using (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.guidebook_collaborators gc
      where gc.guidebook_id = guidebook_change_history.guidebook_id
        and gc.user_id = (select auth.uid())
        and gc.role = 'editor'
    )
  );

drop policy if exists "Guidebook change history: actors and owners insert" on public.guidebook_change_history;
create policy "Guidebook change history: actors and owners insert"
  on public.guidebook_change_history
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and (
      guidebook_id in (
        select id from public.guidebooks where user_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.guidebook_collaborators gc
        where gc.guidebook_id = guidebook_change_history.guidebook_id
          and gc.user_id = (select auth.uid())
          and gc.role = 'editor'
      )
    )
  );

drop policy if exists "Guidebook change history: owners prune" on public.guidebook_change_history;
create policy "Guidebook change history: owners prune"
  on public.guidebook_change_history
  for delete to authenticated
  using (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  );

drop policy if exists "Host assets: owner only" on public.host_assets;
create policy "Host assets: owner only" on public.host_assets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Notifications: owner only" on public.notifications;
create policy "Notifications: owner only" on public.notifications
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Chat sessions: public can create sessions" on public.chat_sessions;
drop policy if exists "Chat sessions: owners can manage own sessions" on public.chat_sessions;
create policy "Chat sessions: owners can manage own sessions" on public.chat_sessions
  for all to authenticated
  using (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  )
  with check (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  );

drop policy if exists "Chat messages: owners can manage messages for own sessions" on public.chat_messages;
create policy "Chat messages: owners can manage messages for own sessions" on public.chat_messages
  for all to authenticated
  using (
    session_id in (
      select cs.id
      from public.chat_sessions cs
      join public.guidebooks g on g.id = cs.guidebook_id
      where g.user_id = (select auth.uid())
    )
  )
  with check (
    session_id in (
      select cs.id
      from public.chat_sessions cs
      join public.guidebooks g on g.id = cs.guidebook_id
      where g.user_id = (select auth.uid())
    )
  );

drop policy if exists "Chat usage: owner only" on public.chat_usage;
create policy "Chat usage: owner only" on public.chat_usage
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Analytics events: public can insert" on public.analytics_events;
drop policy if exists "Analytics events: owners can read own guidebook events" on public.analytics_events;
create policy "Analytics events: owners can read own guidebook events" on public.analytics_events
  for select to authenticated
  using (
    guidebook_id in (
      select id from public.guidebooks where user_id = (select auth.uid())
    )
  );

drop policy if exists "Subscriptions: owner only" on public.subscriptions;
create policy "Subscriptions: owner only" on public.subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Custom domains: owner only" on public.custom_domains;
create policy "Custom domains: owner only" on public.custom_domains
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Templates: public read access" on public.templates;
create policy "Templates: public read access" on public.templates
  for select
  using (true);

drop policy if exists "Store items: owner only" on public.store_items;
create policy "Store items: owner only" on public.store_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Store settings: owner only" on public.store_settings;
create policy "Store settings: owner only" on public.store_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Guidebook storefronts: owner only" on public.guidebook_storefronts;
create policy "Guidebook storefronts: owner only" on public.guidebook_storefronts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Guidebook storefront items: owner only" on public.guidebook_storefront_items;
create policy "Guidebook storefront items: owner only" on public.guidebook_storefront_items
  for all to authenticated
  using (
    storefront_id in (
      select id from public.guidebook_storefronts where user_id = (select auth.uid())
    )
  )
  with check (
    storefront_id in (
      select id from public.guidebook_storefronts where user_id = (select auth.uid())
    )
    and store_item_id in (
      select id from public.store_items where user_id = (select auth.uid())
    )
  );

drop policy if exists "Store requests: owner only" on public.store_requests;
create policy "Store requests: owner only" on public.store_requests
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Store request items: owner only" on public.store_request_items;
create policy "Store request items: owner only" on public.store_request_items
  for all to authenticated
  using (
    request_id in (
      select id from public.store_requests where user_id = (select auth.uid())
    )
  )
  with check (
    request_id in (
      select id from public.store_requests where user_id = (select auth.uid())
    )
  );

drop policy if exists "Store request messages: owner only" on public.store_request_messages;
create policy "Store request messages: owner only" on public.store_request_messages
  for all to authenticated
  using (
    request_id in (
      select id from public.store_requests where user_id = (select auth.uid())
    )
  )
  with check (
    request_id in (
      select id from public.store_requests where user_id = (select auth.uid())
    )
  );

drop policy if exists "Announcement campaigns: recipient read" on public.announcement_campaigns;
create policy "Announcement campaigns: recipient read" on public.announcement_campaigns
  for select to authenticated
  using (
    exists (
      select 1
      from public.announcement_recipients ar
      where ar.campaign_id = announcement_campaigns.id
        and ar.user_id = (select auth.uid())
    )
  );

drop policy if exists "Announcement recipients: owner read" on public.announcement_recipients;
create policy "Announcement recipients: owner read" on public.announcement_recipients
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Announcement events: owner read" on public.announcement_events;
create policy "Announcement events: owner read" on public.announcement_events
  for select to authenticated
  using ((select auth.uid()) = user_id);
