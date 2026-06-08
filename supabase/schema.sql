create type public.user_role as enum ('owner', 'shopkeeper');
create type public.payment_method as enum ('cash', 'card');
create type public.sale_category as enum ('accessories', 'repair', 'telephone');

create table public.owners (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  invite_token text not null unique,
  created_at timestamptz not null default now()
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  name text not null,
  city text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  role public.user_role not null,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  shopkeeper_id uuid not null references public.profiles(id) on delete restrict,
  category public.sale_category not null,
  item_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total numeric(12, 2) generated always as (quantity * unit_price) stored,
  payment_method public.payment_method not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  shopkeeper_id uuid not null references public.profiles(id) on delete restrict,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table public.delivery_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  shopkeeper_id uuid not null references public.profiles(id) on delete restrict,
  supplier_name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.owners enable row level security;
alter table public.shops enable row level security;
alter table public.profiles enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;
alter table public.delivery_payments enable row level security;

create or replace function public.find_owner_by_invite(token_input text)
returns table (
  id uuid,
  name text,
  email text,
  invite_token text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select owners.id, owners.name, owners.email, owners.invite_token, owners.created_at
  from public.owners
  where owners.invite_token = token_input
  limit 1;
$$;

grant execute on function public.find_owner_by_invite(text) to anon, authenticated;

create policy "owners can create own owner row" on public.owners
  for insert to authenticated
  with check (auth_user_id = auth.uid());

create policy "profiles see same owner" on public.profiles
  for select using (owner_id in (select owner_id from public.profiles where id = auth.uid()));

create policy "profiles can create own profile" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "owners see own owner row" on public.owners
  for select using (id in (select owner_id from public.profiles where id = auth.uid()));

create policy "same owner shops" on public.shops
  for select using (owner_id in (select owner_id from public.profiles where id = auth.uid()));

create policy "authenticated users can create invited shops" on public.shops
  for insert to authenticated
  with check (auth.uid() is not null);

create policy "same owner sales" on public.sales
  for select using (owner_id in (select owner_id from public.profiles where id = auth.uid()));

create policy "same owner sales insert" on public.sales
  for insert to authenticated
  with check (owner_id in (select owner_id from public.profiles where id = auth.uid()));

create policy "same owner expenses" on public.expenses
  for select using (owner_id in (select owner_id from public.profiles where id = auth.uid()));

create policy "same owner expenses insert" on public.expenses
  for insert to authenticated
  with check (owner_id in (select owner_id from public.profiles where id = auth.uid()));

create policy "same owner delivery payments" on public.delivery_payments
  for select using (owner_id in (select owner_id from public.profiles where id = auth.uid()));

create policy "same owner delivery payments insert" on public.delivery_payments
  for insert to authenticated
  with check (owner_id in (select owner_id from public.profiles where id = auth.uid()));

create index sales_owner_shop_created_idx on public.sales (owner_id, shop_id, created_at desc);
create index expenses_owner_shop_created_idx on public.expenses (owner_id, shop_id, created_at desc);
create index delivery_owner_shop_created_idx on public.delivery_payments (owner_id, shop_id, created_at desc);
