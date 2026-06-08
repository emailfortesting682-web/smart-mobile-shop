create or replace function public.register_owner_account(
  name_input text,
  email_input text,
  invite_token_input text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  new_owner public.owners;
  new_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'User is not authenticated. Turn off email confirmation for MVP testing, then register again with a new email.';
  end if;

  insert into public.owners (auth_user_id, name, email, invite_token)
  values (auth.uid(), name_input, email_input, invite_token_input)
  returning * into new_owner;

  insert into public.profiles (id, owner_id, role, name, email)
  values (auth.uid(), new_owner.id, 'owner', name_input, email_input)
  returning * into new_profile;

  return new_profile;
end;
$$;

grant execute on function public.register_owner_account(text, text, text) to authenticated;

create or replace function public.register_shopkeeper_account(
  invite_token_input text,
  name_input text,
  email_input text,
  shop_name_input text,
  city_input text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_owner public.owners;
  new_shop public.shops;
  new_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'User is not authenticated. Turn off email confirmation for MVP testing, then register again with a new email.';
  end if;

  select *
  into invited_owner
  from public.owners
  where invite_token = invite_token_input
  limit 1;

  if invited_owner.id is null then
    raise exception 'Invite link is invalid.';
  end if;

  insert into public.shops (owner_id, name, city)
  values (invited_owner.id, shop_name_input, city_input)
  returning * into new_shop;

  insert into public.profiles (id, owner_id, shop_id, role, name, email)
  values (auth.uid(), invited_owner.id, new_shop.id, 'shopkeeper', name_input, email_input)
  returning * into new_profile;

  return new_profile;
end;
$$;

grant execute on function public.register_shopkeeper_account(text, text, text, text, text) to authenticated;
