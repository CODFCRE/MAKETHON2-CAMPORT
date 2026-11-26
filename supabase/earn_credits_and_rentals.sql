-- Apply after supabase/reset_and_schema.sql.

do $$
declare
  v_policy record;
begin
  if pg_catalog.to_regclass('public.ride_bookings') is not null then
    execute 'revoke all privileges on table public.ride_bookings from public, anon, authenticated';
    for v_policy in
      select policyname
      from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename = 'ride_bookings'
    loop
      execute pg_catalog.format(
        'drop policy if exists %I on public.ride_bookings',
        v_policy.policyname
      );
    end loop;
  end if;
end;
$$;

create table if not exists public.cycle_listings (
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

create index if not exists cycle_listings_owner_created_idx
  on public.cycle_listings (owner_id, created_at desc);
create index if not exists cycle_listings_available_idx
  on public.cycle_listings (status, created_at desc)
  where status = 'available';

create table if not exists public.credit_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.garbage_report_reviewers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cycle_service_catalog (
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

alter table public.cycle_service_catalog
  add column if not exists max_rental_hours integer not null default 4
  check (max_rental_hours > 0);

insert into public.cycle_service_catalog (
  id, name, description, category, hourly_rate, credits_per_rupee, max_rental_hours,
  price_unit, eta, image_url, badge
)
values (
  'cycle-rental',
  'Cycle rental',
  'Rent a cycle for local trips and explore at your own pace.',
  'Cycle rental',
  40,
  1,
  4,
  'per hour',
  'Hourly',
  'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1000&q=85',
  'Flexible rental'
)
on conflict (id) do nothing;

create table if not exists public.cycle_subscription_plans (
  plan_code text primary key check (plan_code in ('starter', 'plus')),
  name text not null,
  price_inr integer not null check (price_inr > 0),
  duration_months integer not null check (duration_months > 0),
  daily_rental_limit integer not null check (daily_rental_limit > 0),
  daily_hours_limit integer not null check (daily_hours_limit > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.cycle_subscription_plans (
  plan_code, name, price_inr, duration_months, daily_rental_limit, daily_hours_limit
)
values
  ('starter', 'Starter', 199, 3, 2, 2),
  ('plus', 'Plus', 299, 3, 4, 4)
on conflict (plan_code) do nothing;

drop trigger if exists cycle_service_catalog_set_updated_at on public.cycle_service_catalog;
create trigger cycle_service_catalog_set_updated_at
before update on public.cycle_service_catalog
for each row execute function public.set_updated_at();

drop trigger if exists cycle_subscription_plans_set_updated_at on public.cycle_subscription_plans;
create trigger cycle_subscription_plans_set_updated_at
before update on public.cycle_subscription_plans
for each row execute function public.set_updated_at();

drop trigger if exists cycle_listings_set_updated_at on public.cycle_listings;
create trigger cycle_listings_set_updated_at
before update on public.cycle_listings
for each row execute function public.set_updated_at();

alter table public.food_products
  add column if not exists price_unit text not null default 'per item';
alter table public.food_products
  add column if not exists max_order_quantity integer not null default 50
  check (max_order_quantity between 1 and 50);
alter table public.food_products
  add column if not exists eta text not null default 'Available nearby';
alter table public.food_products
  add column if not exists badge text;

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

create table if not exists public.garbage_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category text not null
    check (category in ('street_litter', 'illegal_dumping', 'overflowing_bin', 'other')),
  description text not null
    check (char_length(btrim(description)) between 10 and 1000),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  evidence_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reward_credits integer not null default 2 check (reward_credits >= 0),
  reviewer_id uuid references public.profiles(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'pending' and reviewer_id is null and reviewed_at is null)
    or (status <> 'pending' and reviewer_id is not null and reviewed_at is not null)
  )
);

create index if not exists garbage_reports_user_created_idx
  on public.garbage_reports (user_id, created_at desc);
create index if not exists garbage_reports_review_queue_idx
  on public.garbage_reports (status, created_at)
  where status = 'pending';

create table if not exists public.cycle_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null check (plan_code in ('starter', 'plus')),
  price_inr integer not null check (price_inr > 0),
  status text not null default 'demo_active'
    check (status in ('demo_active', 'cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.cycle_subscriptions
  drop constraint if exists cycle_subscriptions_price_inr_check;
alter table public.cycle_subscriptions
  add constraint cycle_subscriptions_price_inr_check check (price_inr > 0);

create index if not exists cycle_subscriptions_user_active_idx
  on public.cycle_subscriptions (user_id, ends_at desc)
  where status = 'demo_active';

alter table public.rent_bookings
  add column if not exists billing_source text not null default 'credits'
    check (billing_source in ('credits', 'subscription'));
alter table public.rent_bookings
  add column if not exists subscription_id uuid
    references public.cycle_subscriptions(id) on delete set null;
alter table public.rent_bookings
  add column if not exists credits_charged integer not null default 0
    check (credits_charged >= 0);
alter table public.rent_bookings
  add column if not exists cycle_listing_id uuid
    references public.cycle_listings(id) on delete set null;
alter table public.rent_bookings
  add column if not exists cycle_model text;

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (reason in ('garbage_report_approved', 'cycle_rental', 'cycle_rental_refund')),
  report_id uuid unique references public.garbage_reports(id) on delete restrict,
  rent_booking_id uuid references public.rent_bookings(id) on delete restrict,
  description text not null,
  created_at timestamptz not null default now(),
  check (
    (reason = 'garbage_report_approved' and amount > 0 and report_id is not null and rent_booking_id is null)
    or (
      reason in ('cycle_rental', 'cycle_rental_refund')
      and ((reason = 'cycle_rental' and amount < 0) or (reason = 'cycle_rental_refund' and amount > 0))
      and rent_booking_id is not null
      and report_id is null
    )
  )
);

create index if not exists credit_transactions_user_created_idx
  on public.credit_transactions (user_id, created_at desc);
create unique index if not exists credit_transactions_rental_reason_unique
  on public.credit_transactions (rent_booking_id, reason)
  where rent_booking_id is not null;

create or replace function public.ensure_credit_wallet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.credit_wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_credit_wallet on public.profiles;
create trigger profiles_create_credit_wallet
after insert on public.profiles
for each row execute function public.ensure_credit_wallet();

insert into public.credit_wallets (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.is_garbage_report_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.garbage_report_reviewers r
    where r.user_id = auth.uid()
  );
$$;

alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.garbage_report_reviewers enable row level security;
alter table public.garbage_reports enable row level security;
alter table public.cycle_subscriptions enable row level security;
alter table public.cycle_service_catalog enable row level security;
alter table public.cycle_subscription_plans enable row level security;
alter table public.cycle_listings enable row level security;

drop policy if exists credit_wallets_read_self on public.credit_wallets;
create policy credit_wallets_read_self
on public.credit_wallets for select
to authenticated
using (user_id = auth.uid());

drop policy if exists credit_transactions_read_self on public.credit_transactions;
create policy credit_transactions_read_self
on public.credit_transactions for select
to authenticated
using (user_id = auth.uid());

drop policy if exists garbage_reports_read_owner_or_reviewer on public.garbage_reports;
create policy garbage_reports_read_owner_or_reviewer
on public.garbage_reports for select
to authenticated
using (user_id = auth.uid() or public.is_garbage_report_reviewer());

drop policy if exists garbage_reports_insert_self on public.garbage_reports;
create policy garbage_reports_insert_self
on public.garbage_reports for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and reward_credits = 2
  and reviewer_id is null
  and reviewed_at is null
  and left(evidence_path, char_length(auth.uid()::text) + 1) = auth.uid()::text || '/'
);

drop policy if exists cycle_subscriptions_read_self on public.cycle_subscriptions;
create policy cycle_subscriptions_read_self
on public.cycle_subscriptions for select
to authenticated
using (user_id = auth.uid());

drop policy if exists cycle_service_catalog_read_active on public.cycle_service_catalog;
create policy cycle_service_catalog_read_active
on public.cycle_service_catalog for select
to anon, authenticated
using (is_active);

drop policy if exists cycle_subscription_plans_read_active on public.cycle_subscription_plans;
create policy cycle_subscription_plans_read_active
on public.cycle_subscription_plans for select
to anon, authenticated
using (is_active);

drop policy if exists cycle_listings_read_available_or_owner on public.cycle_listings;
create policy cycle_listings_read_available_or_owner
on public.cycle_listings for select
to anon, authenticated
using (
  status = 'available'
  or owner_id = auth.uid()
);

drop policy if exists cycle_listings_insert_owner on public.cycle_listings;
create policy cycle_listings_insert_owner
on public.cycle_listings for insert
to authenticated
with check (
  owner_id = auth.uid()
  and status = 'available'
  and left(image_path, char_length(auth.uid()::text) + 1) = auth.uid()::text || '/'
);

drop policy if exists cycle_listings_update_owner on public.cycle_listings;
create policy cycle_listings_update_owner
on public.cycle_listings for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and left(image_path, char_length(auth.uid()::text) + 1) = auth.uid()::text || '/'
);

drop policy if exists cycle_listings_delete_owner on public.cycle_listings;
create policy cycle_listings_delete_owner
on public.cycle_listings for delete
to authenticated
using (owner_id = auth.uid() and status <> 'rented');

grant select on public.credit_wallets, public.credit_transactions to authenticated;
grant select on public.garbage_reports to authenticated;
grant insert (category, description, latitude, longitude, evidence_path)
  on public.garbage_reports to authenticated;
grant select on public.cycle_subscriptions to authenticated;
grant select on public.cycle_service_catalog, public.cycle_subscription_plans to anon, authenticated;
grant all on public.cycle_service_catalog, public.cycle_subscription_plans to service_role;
grant select on public.cycle_listings to anon, authenticated;
grant insert (owner_id, model, gear_type, description, hourly_rate, pickup_location, image_path)
  on public.cycle_listings to authenticated;
grant update (model, gear_type, description, hourly_rate, pickup_location, image_path, status)
  on public.cycle_listings to authenticated;
grant delete on public.cycle_listings to authenticated;

revoke all on public.garbage_report_reviewers from anon, authenticated;
revoke insert, update, delete on public.credit_wallets, public.credit_transactions from anon, authenticated;
revoke insert, update, delete on public.cycle_subscriptions from anon, authenticated;
revoke insert, update, delete on public.cycle_service_catalog, public.cycle_subscription_plans from anon, authenticated;
revoke insert, update, delete on public.cycle_listings from anon;
revoke all on public.rent_bookings from authenticated;
grant select on public.rent_bookings to authenticated;
grant update (rental_partner_id, status) on public.rent_bookings to authenticated;
revoke insert on public.food_orders, public.food_order_items from anon, authenticated;
grant select, update (status) on public.food_orders to authenticated;
grant select on public.food_order_items to authenticated;

create or replace function public.refund_credits_for_cancelled_rental()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status not in ('pending', 'accepted', 'ready_for_pickup')
    or new.status <> 'cancelled' then
    return new;
  end if;

  if old.cycle_listing_id is not null then
    update public.cycle_listings
    set status = 'available',
        updated_at = pg_catalog.now()
    where id = old.cycle_listing_id
      and status = 'rented';
  end if;

  if old.credits_charged = 0 then
    return new;
  end if;

  update public.credit_wallets
  set balance = balance + old.credits_charged,
      updated_at = pg_catalog.now()
  where user_id = old.customer_id;

  if not found then
    raise exception 'Credit wallet was not found for cancelled rental';
  end if;

  insert into public.credit_transactions (
    user_id, amount, reason, rent_booking_id, description
  )
  values (
    old.customer_id,
    old.credits_charged,
    'cycle_rental_refund',
    old.id,
    'Cycle rental cancelled; credits refunded'
  );
  return new;
end;
$$;

drop trigger if exists rent_bookings_refund_credits_on_cancel on public.rent_bookings;
create trigger rent_bookings_refund_credits_on_cancel
after update of status on public.rent_bookings
for each row
when (old.status is distinct from new.status)
execute function public.refund_credits_for_cancelled_rental();

create or replace function public.review_garbage_report(
  p_report_id uuid,
  p_decision text,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.garbage_reports%rowtype;
begin
  if auth.uid() is null or not public.is_garbage_report_reviewer() then
    raise exception 'Reviewer access required';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision';
  end if;

  select * into v_report
  from public.garbage_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Report not found';
  end if;
  if v_report.status <> 'pending' then
    raise exception 'Report has already been reviewed';
  end if;
  if v_report.user_id = auth.uid() then
    raise exception 'Reviewers cannot review their own reports';
  end if;

  update public.garbage_reports
  set status = p_decision,
      reviewer_id = auth.uid(),
      review_note = nullif(pg_catalog.btrim(coalesce(p_review_note, '')), ''),
      reviewed_at = pg_catalog.now()
  where id = p_report_id;

  if p_decision = 'approved' then
    insert into public.credit_wallets (user_id)
    values (v_report.user_id)
    on conflict (user_id) do nothing;

    update public.credit_wallets
    set balance = balance + v_report.reward_credits,
        updated_at = pg_catalog.now()
    where user_id = v_report.user_id;

    insert into public.credit_transactions (
      user_id, amount, reason, report_id, description
    )
    values (
      v_report.user_id,
      v_report.reward_credits,
      'garbage_report_approved',
      v_report.id,
      'Garbage report approved'
    );
  end if;
end;
$$;

create or replace function public.activate_demo_cycle_subscription(p_plan_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.cycle_subscription_plans%rowtype;
  v_subscription_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in to activate a demo plan';
  end if;

  select * into v_plan
  from public.cycle_subscription_plans
  where plan_code = p_plan_code
    and is_active;
  if not found then
    raise exception 'This cycle plan is unavailable';
  end if;

  insert into public.credit_wallets (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;
  perform 1 from public.credit_wallets where user_id = v_user_id for update;

  if exists (
    select 1 from public.cycle_subscriptions
    where user_id = v_user_id
      and status = 'demo_active'
      and ends_at > pg_catalog.now()
  ) then
    raise exception 'An active demo plan already exists';
  end if;

  insert into public.cycle_subscriptions (
    user_id, plan_code, price_inr, status, starts_at, ends_at
  )
  values (
    v_user_id,
    p_plan_code,
    v_plan.price_inr,
    'demo_active',
    pg_catalog.now(),
    pg_catalog.now() + pg_catalog.make_interval(months => v_plan.duration_months)
  )
  returning id into v_subscription_id;

  return v_subscription_id;
end;
$$;

drop function if exists public.create_cycle_rental(text, integer);
create or replace function public.create_cycle_rental(
  p_listing_id uuid,
  p_rental_hours integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet_balance integer;
  v_cycle_service public.cycle_service_catalog%rowtype;
  v_cycle_listing public.cycle_listings%rowtype;
  v_subscription public.cycle_subscriptions%rowtype;
  v_plan public.cycle_subscription_plans%rowtype;
  v_has_subscription boolean := false;
  v_daily_rental_limit integer;
  v_daily_hours_limit integer;
  v_included_rentals integer;
  v_included_hours integer;
  v_day_start timestamptz;
  v_billing_source text := 'credits';
  v_subscription_id uuid;
  v_credits_charged integer := 0;
  v_booking_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in to rent a cycle';
  end if;
  if p_listing_id is null then
    raise exception 'Choose an available cycle';
  end if;
  select * into v_cycle_listing
  from public.cycle_listings
  where id = p_listing_id
    and status = 'available'
  for update;
  if not found then
    raise exception 'This cycle is no longer available';
  end if;
  if v_cycle_listing.owner_id = v_user_id then
    raise exception 'You cannot rent your own cycle';
  end if;
  select * into v_cycle_service
  from public.cycle_service_catalog
  where id = 'cycle-rental'
    and is_active;
  if not found then
    raise exception 'Cycle rentals are currently unavailable';
  end if;
  if p_rental_hours is null or p_rental_hours < 1
    or p_rental_hours > v_cycle_service.max_rental_hours then
    raise exception 'Rental duration must be between 1 and % hours', v_cycle_service.max_rental_hours;
  end if;

  insert into public.credit_wallets (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;
  select balance into v_wallet_balance
  from public.credit_wallets
  where user_id = v_user_id
  for update;

  select * into v_subscription
  from public.cycle_subscriptions
  where user_id = v_user_id
    and status = 'demo_active'
    and ends_at > pg_catalog.now()
  order by ends_at desc
  limit 1;
  v_has_subscription := found;

  v_day_start :=
    pg_catalog.date_trunc('day', pg_catalog.now() at time zone 'Asia/Kolkata')
    at time zone 'Asia/Kolkata';

  if v_has_subscription then
    select * into v_plan
    from public.cycle_subscription_plans
    where plan_code = v_subscription.plan_code;
    if not found then
      raise exception 'The active cycle plan configuration is missing';
    end if;
    v_daily_rental_limit := v_plan.daily_rental_limit;
    v_daily_hours_limit := v_plan.daily_hours_limit;

    select count(*)::integer, coalesce(sum(rental_hours), 0)::integer
    into v_included_rentals, v_included_hours
    from public.rent_bookings
    where customer_id = v_user_id
      and billing_source = 'subscription'
      and status <> 'cancelled'
      and created_at >= v_day_start
      and created_at < v_day_start + interval '1 day';

    if v_included_rentals < v_daily_rental_limit
      and v_included_hours + p_rental_hours <= v_daily_hours_limit then
      v_billing_source := 'subscription';
      v_subscription_id := v_subscription.id;
    end if;
  end if;

  if v_billing_source = 'credits' then
    v_credits_charged :=
      p_rental_hours * v_cycle_listing.hourly_rate * v_cycle_service.credits_per_rupee;
    if v_wallet_balance < v_credits_charged then
      raise exception 'Not enough credits. This rental needs % credits.', v_credits_charged;
    end if;
  end if;

  update public.cycle_listings
  set status = 'rented',
      updated_at = pg_catalog.now()
  where id = v_cycle_listing.id;

  insert into public.rent_bookings (
    customer_id,
    rental_partner_id,
    cycle_listing_id,
    cycle_model,
    pickup_location,
    rental_hours,
    hourly_rate,
    status,
    billing_source,
    subscription_id,
    credits_charged
  )
  values (
    v_user_id,
    v_cycle_listing.owner_id,
    v_cycle_listing.id,
    v_cycle_listing.model,
    v_cycle_listing.pickup_location,
    p_rental_hours,
    v_cycle_listing.hourly_rate,
    'pending',
    v_billing_source,
    v_subscription_id,
    v_credits_charged
  )
  returning id into v_booking_id;

  if v_credits_charged > 0 then
    update public.credit_wallets
    set balance = balance - v_credits_charged,
        updated_at = pg_catalog.now()
    where user_id = v_user_id
    returning balance into v_wallet_balance;

    insert into public.credit_transactions (
      user_id, amount, reason, rent_booking_id, description
    )
    values (
      v_user_id,
      -v_credits_charged,
      'cycle_rental',
      v_booking_id,
      pg_catalog.format('Cycle rental: %s hour(s)', p_rental_hours)
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'booking_id', v_booking_id,
    'billing_source', v_billing_source,
    'credits_charged', v_credits_charged,
    'balance', v_wallet_balance,
    'rental_hours', p_rental_hours,
    'hourly_rate', v_cycle_listing.hourly_rate,
    'cycle_listing_id', v_cycle_listing.id,
    'credits_per_rupee', v_cycle_service.credits_per_rupee
  );
end;
$$;

revoke all on function public.is_garbage_report_reviewer() from public, anon;
revoke all on function public.review_garbage_report(uuid, text, text) from public, anon;
revoke all on function public.activate_demo_cycle_subscription(text) from public, anon;
revoke all on function public.create_cycle_rental(uuid, integer) from public, anon;
revoke all on function public.create_food_order(uuid, integer, text, text) from public, anon;
grant execute on function public.is_garbage_report_reviewer() to authenticated;
grant execute on function public.review_garbage_report(uuid, text, text) to authenticated;
grant execute on function public.activate_demo_cycle_subscription(text) to authenticated;
grant execute on function public.create_cycle_rental(uuid, integer) to authenticated;
grant execute on function public.create_food_order(uuid, integer, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'garbage-report-evidence',
  'garbage-report-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists garbage_evidence_insert_own on storage.objects;
create policy garbage_evidence_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'garbage-report-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists garbage_evidence_read_own_or_reviewer on storage.objects;
create policy garbage_evidence_read_own_or_reviewer
on storage.objects for select
to authenticated
using (
  bucket_id = 'garbage-report-evidence'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_garbage_report_reviewer()
  )
);

drop policy if exists garbage_evidence_delete_unlinked_own on storage.objects;
create policy garbage_evidence_delete_unlinked_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'garbage-report-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (
    select 1
    from public.garbage_reports r
    where r.evidence_path = storage.objects.name
  )
);

-- Bootstrap reviewers through the Supabase SQL editor after their account exists:
-- insert into public.garbage_report_reviewers (user_id)
-- values ('AUTH_USER_UUID');
