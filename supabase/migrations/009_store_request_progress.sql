-- Store request progress tracking and guest payment proof.

ALTER TABLE public.store_requests
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_proof_url text,
  ADD COLUMN IF NOT EXISTS payment_proof_note text,
  ADD COLUMN IF NOT EXISTS payment_proof_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.store_requests
  DROP CONSTRAINT IF EXISTS store_requests_payment_status_check;

ALTER TABLE public.store_requests
  ADD CONSTRAINT store_requests_payment_status_check CHECK (
    payment_status IN (
      'external_pending',
      'proof_submitted',
      'external_paid',
      'not_required'
    )
  );
