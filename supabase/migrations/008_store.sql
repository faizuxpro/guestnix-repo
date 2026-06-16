-- Optional first-class guidebook Store, reusable host catalog, and
-- Store-specific request threads.

CREATE TABLE IF NOT EXISTS public.store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  unit_label text,
  category text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_items_price_nonnegative CHECK (price_cents >= 0),
  CONSTRAINT store_items_currency_check CHECK (char_length(currency) = 3)
);

CREATE INDEX IF NOT EXISTS idx_store_items_user
  ON public.store_items(user_id);

CREATE INDEX IF NOT EXISTS idx_store_items_user_active
  ON public.store_items(user_id, active);

CREATE TABLE IF NOT EXISTS public.guidebook_storefronts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guidebook_id uuid NOT NULL REFERENCES public.guidebooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  payment_method_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guidebook_storefronts_unique_guidebook UNIQUE (guidebook_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_storefronts_guidebook
  ON public.guidebook_storefronts(guidebook_id);

CREATE INDEX IF NOT EXISTS idx_storefronts_user
  ON public.guidebook_storefronts(user_id);

CREATE TABLE IF NOT EXISTS public.guidebook_storefront_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id uuid NOT NULL REFERENCES public.guidebook_storefronts(id) ON DELETE CASCADE,
  store_item_id uuid NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  max_quantity integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guidebook_storefront_items_unique_item UNIQUE (storefront_id, store_item_id),
  CONSTRAINT guidebook_storefront_items_max_quantity_positive CHECK (
    max_quantity IS NULL OR max_quantity > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_storefront_items_storefront
  ON public.guidebook_storefront_items(storefront_id, order_index);

CREATE TABLE IF NOT EXISTS public.store_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guidebook_id uuid NOT NULL REFERENCES public.guidebooks(id) ON DELETE CASCADE,
  storefront_id uuid REFERENCES public.guidebook_storefronts(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_session_id uuid REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  request_code text NOT NULL UNIQUE,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  guest_access_token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  payment_status text NOT NULL DEFAULT 'external_pending',
  currency text NOT NULL DEFAULT 'USD',
  subtotal_cents integer NOT NULL DEFAULT 0,
  guest_note text,
  host_note text,
  requested_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_requests_status_check CHECK (
    status IN ('new', 'accepted', 'fulfilled', 'cancelled')
  ),
  CONSTRAINT store_requests_payment_status_check CHECK (
    payment_status IN ('external_pending', 'external_paid', 'not_required')
  ),
  CONSTRAINT store_requests_subtotal_nonnegative CHECK (subtotal_cents >= 0),
  CONSTRAINT store_requests_currency_check CHECK (char_length(currency) = 3)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_requests_token_hash
  ON public.store_requests(guest_access_token_hash);

CREATE INDEX IF NOT EXISTS idx_store_requests_user_created
  ON public.store_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_requests_guidebook
  ON public.store_requests(guidebook_id);

CREATE INDEX IF NOT EXISTS idx_store_requests_status
  ON public.store_requests(user_id, status);

CREATE TABLE IF NOT EXISTS public.store_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.store_requests(id) ON DELETE CASCADE,
  store_item_id uuid REFERENCES public.store_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_description text,
  unit_price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  quantity integer NOT NULL,
  line_total_cents integer NOT NULL DEFAULT 0,
  CONSTRAINT store_request_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT store_request_items_price_nonnegative CHECK (unit_price_cents >= 0),
  CONSTRAINT store_request_items_total_nonnegative CHECK (line_total_cents >= 0),
  CONSTRAINT store_request_items_currency_check CHECK (char_length(currency) = 3)
);

CREATE INDEX IF NOT EXISTS idx_store_request_items_request
  ON public.store_request_items(request_id);

CREATE INDEX IF NOT EXISTS idx_store_request_items_store_item
  ON public.store_request_items(store_item_id);

CREATE TABLE IF NOT EXISTS public.store_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.store_requests(id) ON DELETE CASCADE,
  author_type text NOT NULL,
  author_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name text,
  guest_email text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_request_messages_author_type_check CHECK (
    author_type IN ('guest', 'host')
  )
);

CREATE INDEX IF NOT EXISTS idx_store_request_messages_request_created
  ON public.store_request_messages(request_id, created_at);

ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidebook_storefronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidebook_storefront_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_request_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store items: owner only" ON public.store_items;
CREATE POLICY "Store items: owner only" ON public.store_items
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guidebook storefronts: owner only" ON public.guidebook_storefronts;
CREATE POLICY "Guidebook storefronts: owner only" ON public.guidebook_storefronts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guidebook storefront items: owner only" ON public.guidebook_storefront_items;
CREATE POLICY "Guidebook storefront items: owner only" ON public.guidebook_storefront_items
  FOR ALL USING (
    storefront_id IN (
      SELECT id
      FROM public.guidebook_storefronts
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    storefront_id IN (
      SELECT id
      FROM public.guidebook_storefronts
      WHERE user_id = auth.uid()
    )
    AND store_item_id IN (
      SELECT id
      FROM public.store_items
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store requests: owner only" ON public.store_requests;
CREATE POLICY "Store requests: owner only" ON public.store_requests
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Store request items: owner only" ON public.store_request_items;
CREATE POLICY "Store request items: owner only" ON public.store_request_items
  FOR ALL USING (
    request_id IN (
      SELECT id
      FROM public.store_requests
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    request_id IN (
      SELECT id
      FROM public.store_requests
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store request messages: owner only" ON public.store_request_messages;
CREATE POLICY "Store request messages: owner only" ON public.store_request_messages
  FOR ALL USING (
    request_id IN (
      SELECT id
      FROM public.store_requests
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    request_id IN (
      SELECT id
      FROM public.store_requests
      WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_store_items_updated_at ON public.store_items;
CREATE TRIGGER update_store_items_updated_at
  BEFORE UPDATE ON public.store_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_guidebook_storefronts_updated_at ON public.guidebook_storefronts;
CREATE TRIGGER update_guidebook_storefronts_updated_at
  BEFORE UPDATE ON public.guidebook_storefronts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_guidebook_storefront_items_updated_at ON public.guidebook_storefront_items;
CREATE TRIGGER update_guidebook_storefront_items_updated_at
  BEFORE UPDATE ON public.guidebook_storefront_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_store_requests_updated_at ON public.store_requests;
CREATE TRIGGER update_store_requests_updated_at
  BEFORE UPDATE ON public.store_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
