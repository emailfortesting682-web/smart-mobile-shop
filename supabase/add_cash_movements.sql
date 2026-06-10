create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  shopkeeper_id uuid not null references public.profiles(id) on delete restrict,
  taken_by_type text not null check (taken_by_type in ('owner', 'worker')),
  taken_by_name text not null,
  reason text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.cash_movements enable row level security;

drop policy if exists "same owner cash movements" on public.cash_movements;
drop policy if exists "same owner cash movements insert" on public.cash_movements;

create policy "same owner cash movements" on public.cash_movements
  for select using (owner_id = public.current_owner_id());

create policy "same owner cash movements insert" on public.cash_movements
  for insert to authenticated
  with check (owner_id = public.current_owner_id());

create index if not exists cash_movements_owner_shop_created_idx
  on public.cash_movements (owner_id, shop_id, created_at desc);
