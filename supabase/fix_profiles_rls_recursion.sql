create or replace function public.current_owner_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select owner_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_owner_id() to authenticated;

drop policy if exists "profiles see same owner" on public.profiles;
drop policy if exists "owners see own owner row" on public.owners;
drop policy if exists "same owner shops" on public.shops;
drop policy if exists "same owner sales" on public.sales;
drop policy if exists "same owner sales insert" on public.sales;
drop policy if exists "same owner expenses" on public.expenses;
drop policy if exists "same owner expenses insert" on public.expenses;
drop policy if exists "same owner delivery payments" on public.delivery_payments;
drop policy if exists "same owner delivery payments insert" on public.delivery_payments;

create policy "profiles see same owner" on public.profiles
  for select using (owner_id = public.current_owner_id());

create policy "owners see own owner row" on public.owners
  for select using (id = public.current_owner_id());

create policy "same owner shops" on public.shops
  for select using (owner_id = public.current_owner_id());

create policy "same owner sales" on public.sales
  for select using (owner_id = public.current_owner_id());

create policy "same owner sales insert" on public.sales
  for insert to authenticated
  with check (owner_id = public.current_owner_id());

create policy "same owner expenses" on public.expenses
  for select using (owner_id = public.current_owner_id());

create policy "same owner expenses insert" on public.expenses
  for insert to authenticated
  with check (owner_id = public.current_owner_id());

create policy "same owner delivery payments" on public.delivery_payments
  for select using (owner_id = public.current_owner_id());

create policy "same owner delivery payments insert" on public.delivery_payments
  for insert to authenticated
  with check (owner_id = public.current_owner_id());
