alter table public.owners
  add column if not exists status text not null default 'active'
  check (status in ('active', 'suspended'));

alter table public.profiles
  add column if not exists status text not null default 'active'
  check (status in ('active', 'suspended'));

create index if not exists owners_status_idx on public.owners (status);
create index if not exists profiles_owner_status_idx on public.profiles (owner_id, status);
