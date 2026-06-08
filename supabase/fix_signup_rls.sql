drop policy if exists "owners can create own owner row" on public.owners;
drop policy if exists "profiles can create own profile" on public.profiles;
drop policy if exists "authenticated users can create invited shops" on public.shops;

create policy "owners can create own owner row" on public.owners
  for insert to authenticated
  with check (auth_user_id = auth.uid());

create policy "profiles can create own profile" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "authenticated users can create invited shops" on public.shops
  for insert to authenticated
  with check (auth.uid() is not null);
