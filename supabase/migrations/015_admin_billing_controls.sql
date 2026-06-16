-- Admin billing controls: coupon lifecycle metadata and audit log.

alter table public.coupons
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists archived_at timestamptz;

create index if not exists idx_coupons_archived_active
  on public.coupons (archived_at, active);

create table if not exists public.admin_billing_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  before jsonb not null default '{}'::jsonb,
  after jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_billing_audit_actor
  on public.admin_billing_audit_logs (actor_user_id, created_at);

create index if not exists idx_admin_billing_audit_target
  on public.admin_billing_audit_logs (target_type, target_id);

create index if not exists idx_admin_billing_audit_created
  on public.admin_billing_audit_logs (created_at);

alter table public.admin_billing_audit_logs enable row level security;
