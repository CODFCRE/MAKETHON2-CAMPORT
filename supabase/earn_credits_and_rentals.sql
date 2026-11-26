-- Apply after supabase/reset_and_schema.sql.

create table if not exists public.credit_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.garbage_report_reviewers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

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
  price_inr integer not null check (price_inr in (199, 299)),
  status text not null default 'demo_active'
    check (status in ('demo_active', 'cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

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

grant select on public.credit_wallets, public.credit_transactions to authenticated;
grant select on public.garbage_reports to authenticated;
grant insert (category, description, latitude, longitude, evidence_path)
  on public.garbage_reports to authenticated;
grant select on public.cycle_subscriptions to authenticated;

revoke all on public.garbage_report_reviewers from anon, authenticated;
revoke insert, update, delete on public.credit_wallets, public.credit_transactions from anon, authenticated;
revoke insert, update, delete on public.cycle_subscriptions from anon, authenticated;
revoke all on public.rent_bookings from authenticated;
grant select on public.rent_bookings to authenticated;
grant update (rental_partner_id, status) on public.rent_bookings to authenticated;

create or replace function public.refund_credits_for_cancelled_rental()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status not in ('pending', 'accepted', 'ready_for_pickup')
    or new.status <> 'cancelled'
    or old.credits_charged = 0 then
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
  v_price integer;
  v_subscription_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in to activate a demo plan';
  end if;
  if p_plan_code = 'starter' then
    v_price := 199;
  elsif p_plan_code = 'plus' then
    v_price := 299;
  else
    raise exception 'Invalid cycle plan';
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
    v_price,
    'demo_active',
    pg_catalog.now(),
    pg_catalog.now() + interval '3 months'
  )
  returning id into v_subscription_id;

  return v_subscription_id;
end;
$$;

create or replace function public.create_cycle_rental(
  p_pickup_location text,
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
  v_subscription public.cycle_subscriptions%rowtype;
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
  if pg_catalog.btrim(coalesce(p_pickup_location, '')) = '' then
    raise exception 'Pickup location is required';
  end if;
  if p_rental_hours is null or p_rental_hours < 1 or p_rental_hours > 4 then
    raise exception 'Rental duration must be between 1 and 4 hours';
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
    if v_subscription.plan_code = 'starter' then
      v_daily_rental_limit := 2;
      v_daily_hours_limit := 2;
    else
      v_daily_rental_limit := 4;
      v_daily_hours_limit := 4;
    end if;

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
    v_credits_charged := p_rental_hours * 40;
    if v_wallet_balance < v_credits_charged then
      raise exception 'Not enough credits. This rental needs % credits.', v_credits_charged;
    end if;
  end if;

  insert into public.rent_bookings (
    customer_id,
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
    pg_catalog.btrim(p_pickup_location),
    p_rental_hours,
    40,
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
    'rental_hours', p_rental_hours
  );
end;
$$;

revoke all on function public.is_garbage_report_reviewer() from public, anon;
revoke all on function public.review_garbage_report(uuid, text, text) from public, anon;
revoke all on function public.activate_demo_cycle_subscription(text) from public, anon;
revoke all on function public.create_cycle_rental(text, integer) from public, anon;
grant execute on function public.is_garbage_report_reviewer() to authenticated;
grant execute on function public.review_garbage_report(uuid, text, text) to authenticated;
grant execute on function public.activate_demo_cycle_subscription(text) to authenticated;
grant execute on function public.create_cycle_rental(text, integer) to authenticated;

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
