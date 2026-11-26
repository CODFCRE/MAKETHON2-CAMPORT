-- DESTRUCTIVE: This resets every non-extension table and every RLS policy in
-- the public schema, plus policies on storage.objects/storage.buckets.
-- It preserves auth.users and other auth objects; it installs a profile-sync
-- trigger on auth.users.
--
-- Storage file contents cannot be safely deleted with SQL. Empty existing
-- buckets through Supabase Storage API/Dashboard before running this script.

begin;

do $$
declare
  item record;
begin
  for item in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      item.policyname,
      item.schemaname,
      item.tablename
    );
  end loop;

  for item in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename in ('objects', 'buckets')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      item.policyname,
      item.schemaname,
      item.tablename
    );
  end loop;

  for item in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relispartition
      and not exists (
        select 1
        from pg_depend d
        where d.classid = 'pg_class'::regclass
          and d.objid = c.oid
          and d.deptype = 'e'
      )
  loop
    execute format('drop table if exists public.%I cascade', item.relname);
  end loop;
end
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default 'Neighbor',
  avatar_url text,
  username text,
  title text,
  bio text,
  account_type text not null default 'customer'
    check (account_type in ('customer', 'driver', 'store_owner', 'rental_partner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cycle_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  model text not null check (char_length(btrim(model)) between 2 and 100),
  gear_type text not null check (gear_type in ('geared', 'non_geared')),
  description text not null check (char_length(btrim(description)) between 10 and 2000),
  hourly_rate integer not null check (hourly_rate > 0),
  pickup_location text not null,
  image_path text not null,
  status text not null default 'available' check (status in ('available', 'rented', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (left(image_path, char_length(owner_id::text) + 1) = owner_id::text || '/')
);

create table public.rent_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rental_partner_id uuid references public.profiles(id) on delete set null,
  cycle_listing_id uuid references public.cycle_listings(id) on delete set null,
  cycle_model text,
  pickup_location text not null,
  rental_hours integer not null check (rental_hours > 0),
  hourly_rate numeric(10, 2) not null default 40 check (hourly_rate > 0),
  estimated_total numeric(10, 2)
    generated always as (rental_hours * hourly_rate) stored,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'ready_for_pickup', 'in_progress', 'completed', 'cancelled')),
  scheduled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cycle_service_catalog (
  id text primary key check (id = 'cycle-rental'),
  name text not null,
  description text not null,
  category text not null,
  hourly_rate integer not null check (hourly_rate > 0),
  credits_per_rupee integer not null default 1 check (credits_per_rupee > 0),
  max_rental_hours integer not null default 4 check (max_rental_hours > 0),
  price_unit text not null,
  eta text not null,
  image_url text,
  badge text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.cycle_service_catalog (
  id, name, description, category, hourly_rate, credits_per_rupee, price_unit, eta, image_url, badge
)
values (
  'cycle-rental',
  'Cycle rental',
  'Rent a cycle for local trips and explore at your own pace.',
  'Cycle rental',
  40,
  1,
  'per hour',
  'Hourly',
  'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1000&q=85',
  'Flexible rental'
);

create table public.food_stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  address text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.food_stores(id) on delete cascade,
  name text not null,
  description text,
  category text,
  price numeric(10, 2) not null check (price >= 0),
  max_order_quantity integer not null default 50 check (max_order_quantity between 1 and 50),
  price_unit text not null default 'per item',
  eta text not null default 'Available nearby',
  badge text,
  image_path text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.food_stores(id) on delete restrict,
  fulfillment text not null check (fulfillment in ('delivery', 'pickup')),
  delivery_address text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fulfillment = 'pickup' or delivery_address is not null)
);

create table public.food_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.food_orders(id) on delete cascade,
  product_id uuid references public.food_products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 50),
  created_at timestamptz not null default now()
);

create index rent_bookings_customer_created_idx
  on public.rent_bookings (customer_id, created_at desc);
create index cycle_listings_owner_created_idx
  on public.cycle_listings (owner_id, created_at desc);
create index cycle_listings_available_idx
  on public.cycle_listings (status, created_at desc)
  where status = 'available';
create index rent_bookings_partner_status_idx
  on public.rent_bookings (rental_partner_id, status);

  create or replace function public.create_food_order(
    p_product_id uuid,
    p_quantity integer,
    p_fulfillment text,
    p_delivery_address text default null
  )
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_user_id uuid := auth.uid();
    v_product public.food_products%rowtype;
    v_order_id uuid;
    v_subtotal numeric(10, 2);
  begin
    if v_user_id is null then
      raise exception 'Sign in to place a food order';
    end if;
    if p_quantity is null or p_quantity < 1 then
      raise exception 'Quantity must be at least 1';
    end if;
    if p_fulfillment is null or p_fulfillment not in ('delivery', 'pickup') then
      raise exception 'Invalid fulfillment option';
    end if;
    if p_fulfillment = 'delivery' and nullif(pg_catalog.btrim(p_delivery_address), '') is null then
      raise exception 'Delivery address is required';
    end if;

    select p.* into v_product
    from public.food_products p
    join public.food_stores s on s.id = p.store_id
    where p.id = p_product_id
      and p.is_available
      and s.is_active
    for share of p, s;

    if not found then
      raise exception 'This food item is no longer available';
    end if;
    if p_quantity > v_product.max_order_quantity then
      raise exception 'This food item can only be ordered up to % at a time', v_product.max_order_quantity;
    end if;

    v_subtotal := v_product.price * p_quantity;

    insert into public.food_orders (
      customer_id, store_id, fulfillment, delivery_address, status, subtotal, delivery_fee, total
    )
    values (
      v_user_id,
      v_product.store_id,
      p_fulfillment,
      case when p_fulfillment = 'delivery' then pg_catalog.btrim(p_delivery_address) else null end,
      'pending',
      v_subtotal,
      0,
      v_subtotal
    )
    returning id into v_order_id;

    insert into public.food_order_items (
      order_id, product_id, product_name, unit_price, quantity
    )
    values (
      v_order_id, v_product.id, v_product.name, v_product.price, p_quantity
    );

    return pg_catalog.jsonb_build_object(
      'order_id', v_order_id,
      'total', v_subtotal,
      'quantity', p_quantity
    );
  end;
  $$;

create index food_stores_active_idx
  on public.food_stores (is_active);
create index food_products_store_available_idx
  on public.food_products (store_id, is_available);
create index food_orders_customer_created_idx
  on public.food_orders (customer_id, created_at desc);
create index food_orders_store_status_idx
  on public.food_orders (store_id, status);
create index food_order_items_order_idx
  on public.food_order_items (order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Neighbor'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists camport_create_profile_after_auth_user on auth.users;
create trigger camport_create_profile_after_auth_user
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger rent_bookings_set_updated_at
before update on public.rent_bookings
for each row execute function public.set_updated_at();

create trigger cycle_listings_set_updated_at
before update on public.cycle_listings
for each row execute function public.set_updated_at();

create trigger food_stores_set_updated_at
before update on public.food_stores
for each row execute function public.set_updated_at();

create trigger food_products_set_updated_at
before update on public.food_products
for each row execute function public.set_updated_at();

create trigger cycle_service_catalog_set_updated_at
before update on public.cycle_service_catalog
for each row execute function public.set_updated_at();

create trigger food_orders_set_updated_at
before update on public.food_orders
for each row execute function public.set_updated_at();

insert into public.profiles (id, email, full_name, avatar_url)
select
  id,
  coalesce(email, ''),
  coalesce(
    nullif(raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(coalesce(email, ''), '@', 1), ''),
    'Neighbor'
  ),
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.rent_bookings enable row level security;
alter table public.cycle_listings enable row level security;
alter table public.cycle_service_catalog enable row level security;
alter table public.food_stores enable row level security;
alter table public.food_products enable row level security;
alter table public.food_orders enable row level security;
alter table public.food_order_items enable row level security;

create policy cycle_service_catalog_read_active
on public.cycle_service_catalog for select
to anon, authenticated
using (is_active);

create policy profiles_read_self
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_self
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy rent_bookings_read_customer_or_partner
on public.rent_bookings for select
to authenticated
using (
  customer_id = auth.uid()
  or rental_partner_id = auth.uid()
  or (
    rental_partner_id is null
    and status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_type = 'rental_partner'
    )
  )
);

create policy cycle_listings_read_available_or_owner
on public.cycle_listings for select
to anon, authenticated
using (
  status = 'available'
  or owner_id = auth.uid()
);

create policy cycle_listings_insert_owner
on public.cycle_listings for insert
to authenticated
with check (
  owner_id = auth.uid()
  and status = 'available'
  and left(image_path, char_length(auth.uid()::text) + 1) = auth.uid()::text || '/'
);

create policy cycle_listings_update_owner
on public.cycle_listings for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and left(image_path, char_length(auth.uid()::text) + 1) = auth.uid()::text || '/'
);

create policy cycle_listings_delete_owner
on public.cycle_listings for delete
to authenticated
using (owner_id = auth.uid() and status <> 'rented');

create policy rent_bookings_insert_customer
on public.rent_bookings for insert
to authenticated
with check (
  customer_id = auth.uid()
  and rental_partner_id is null
  and status = 'pending'
);

create policy rent_bookings_cancel_customer
on public.rent_bookings for update
to authenticated
using (customer_id = auth.uid() and status = 'pending')
with check (
  customer_id = auth.uid()
  and status = 'cancelled'
  and rental_partner_id is null
);

create policy rent_bookings_update_partner
on public.rent_bookings for update
to authenticated
using (
  rental_partner_id = auth.uid()
  or (
    rental_partner_id is null
    and status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_type = 'rental_partner'
    )
  )
)
with check (
  rental_partner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_type = 'rental_partner'
  )
);

create policy food_stores_read_active_or_owned
on public.food_stores for select
to anon, authenticated
using (
  is_active
  or owner_id = auth.uid()
);

create policy food_stores_insert_owner
on public.food_stores for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_type = 'store_owner'
  )
);

create policy food_stores_update_owner
on public.food_stores for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_type = 'store_owner'
  )
);

create policy food_stores_delete_owner
on public.food_stores for delete
to authenticated
using (owner_id = auth.uid());

create policy food_products_read_available
on public.food_products for select
to anon, authenticated
using (
  exists (
    select 1 from public.food_stores s
    where s.id = store_id
      and (
        (s.is_active and is_available)
        or s.owner_id = auth.uid()
      )
  )
);

create policy food_products_insert_store_owner
on public.food_products for insert
to authenticated
with check (
  exists (
    select 1 from public.food_stores s
    where s.id = store_id and s.owner_id = auth.uid()
  )
);

create policy food_products_update_store_owner
on public.food_products for update
to authenticated
using (
  exists (
    select 1 from public.food_stores s
    where s.id = store_id and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.food_stores s
    where s.id = store_id and s.owner_id = auth.uid()
  )
);

create policy food_products_delete_store_owner
on public.food_products for delete
to authenticated
using (
  exists (
    select 1 from public.food_stores s
    where s.id = store_id and s.owner_id = auth.uid()
  )
);

create policy food_orders_read_customer_or_store_owner
on public.food_orders for select
to authenticated
using (
  customer_id = auth.uid()
  or exists (
    select 1 from public.food_stores s
    where s.id = store_id and s.owner_id = auth.uid()
  )
);

create policy food_orders_insert_customer
on public.food_orders for insert
to authenticated
with check (
  customer_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.food_stores s
    where s.id = store_id and s.is_active
  )
);

create policy food_orders_cancel_customer
on public.food_orders for update
to authenticated
using (customer_id = auth.uid() and status = 'pending')
with check (customer_id = auth.uid() and status = 'cancelled');

create policy food_orders_update_store_owner
on public.food_orders for update
to authenticated
using (
  exists (
    select 1 from public.food_stores s
    where s.id = store_id and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.food_stores s
    where s.id = store_id and s.owner_id = auth.uid()
  )
);

create policy food_order_items_read_order_participants
on public.food_order_items for select
to authenticated
using (
  exists (
    select 1
    from public.food_orders o
    left join public.food_stores s on s.id = o.store_id
    where o.id = order_id
      and (o.customer_id = auth.uid() or s.owner_id = auth.uid())
  )
);

create policy food_order_items_insert_customer
on public.food_order_items for insert
to authenticated
with check (
  exists (
    select 1
    from public.food_orders o
    join public.food_products p on p.id = product_id
    where o.id = order_id
      and o.customer_id = auth.uid()
      and o.status = 'pending'
      and p.store_id = o.store_id
      and p.is_available
  )
);

revoke all on all tables in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles to authenticated;
grant select on public.food_stores, public.food_products to anon, authenticated;
grant insert (id, email, full_name, avatar_url, created_at, username, title, bio)
  on public.profiles to authenticated;
grant update (full_name, avatar_url, username, title, bio)
  on public.profiles to authenticated;
grant select on public.rent_bookings to authenticated;
grant insert (customer_id, pickup_location, rental_hours, scheduled_at, notes)
  on public.rent_bookings to authenticated;
grant update (rental_partner_id, status)
  on public.rent_bookings to authenticated;
grant select on public.cycle_listings to anon, authenticated;
grant insert (owner_id, model, gear_type, description, hourly_rate, pickup_location, image_path)
  on public.cycle_listings to authenticated;
grant update (model, gear_type, description, hourly_rate, pickup_location, image_path, status)
  on public.cycle_listings to authenticated;
grant delete on public.cycle_listings to authenticated;
grant select, insert, update, delete on public.food_stores, public.food_products to authenticated;
grant select on public.cycle_service_catalog to anon, authenticated;
grant select, update (status) on public.food_orders to authenticated;
grant select on public.food_order_items to authenticated;
grant all on all tables in schema public to service_role;
revoke insert, update, delete on public.cycle_service_catalog from anon, authenticated;
revoke insert on public.food_orders, public.food_order_items from anon, authenticated;
revoke all on function public.create_food_order(uuid, integer, text, text) from public, anon;
grant execute on function public.create_food_order(uuid, integer, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketplace-media',
  'marketplace-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy marketplace_media_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'marketplace-media');

create policy marketplace_media_upload_own_folder
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'marketplace-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy marketplace_media_update_own_folder
on storage.objects for update
to authenticated
using (
  bucket_id = 'marketplace-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'marketplace-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy marketplace_media_delete_own_folder
on storage.objects for delete
to authenticated
using (
  bucket_id = 'marketplace-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
