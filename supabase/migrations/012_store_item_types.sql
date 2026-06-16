ALTER TABLE public.store_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'product';

ALTER TABLE public.store_items
  DROP CONSTRAINT IF EXISTS store_items_item_type_check;

ALTER TABLE public.store_items
  ADD CONSTRAINT store_items_item_type_check
  CHECK (item_type IN ('product', 'service'));

CREATE INDEX IF NOT EXISTS idx_store_items_user_type
  ON public.store_items(user_id, item_type);
