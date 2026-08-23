-- M G Prakash Catering — Supabase schema
--
-- Safe to re-run: every statement is idempotent, and the dishes columns added
-- after the first release use `add column if not exists` so an existing
-- database migrates in place without dropping the table (which would cascade
-- into meal_dishes and take live orders with it).

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Dishes (seeded from food_db.json5 via `npm run seed`)
-- ---------------------------------------------------------------------------
create table if not exists dishes (
  id                text primary key,
  name              text not null,
  description       text not null default '',
  image_url         text,
  course            text[] not null default '{}',
  cuisine           text,
  diet              text not null,
  -- Retained but unused. A fixed spice classification was removed from the
  -- catalogue: how hot a dish should be is a per-customer preference, captured
  -- as a per-dish note on the order instead. Nothing reads or writes this
  -- column; it is kept only because dropping a column is irreversible and this
  -- file is add-only. Safe to drop by hand once you are sure.
  spice_level       text,
  flavour_profile   jsonb not null default '[]',
  cooking_method    jsonb not null default '[]',
  ingredients       jsonb not null default '[]',
  tags              jsonb not null default '[]',
  occasion_fit      jsonb not null default '[]',
  region_of_origin  text
);

-- Columns added with the catalogue expansion.
alter table dishes add column if not exists alt_names             jsonb   not null default '[]';
alter table dishes add column if not exists cuisine_group         text;
alter table dishes add column if not exists is_vegan              boolean not null default false;
-- Retired, and kept for the same reason as spice_level above: nothing reads or
-- writes these two any more, but dropping a column is irreversible and this
-- file is add-only. They recorded a customisation as though it were a property
-- of the dish — nearly anything on the list can be cooked without onion and
-- garlic, or to Jain rules — so the requirement is now stated by the customer
-- as a note on the order (orders.notes). Safe to drop by hand once you are
-- sure. Do not start writing them again.
alter table dishes add column if not exists is_jain               boolean not null default false;
alter table dishes add column if not exists contains_onion_garlic boolean not null default true;
alter table dishes add column if not exists blur_data_url         text;
alter table dishes add column if not exists image_licence         text    not null default 'placeholder';
alter table dishes add column if not exists image_credit          text;
alter table dishes add column if not exists image_source_url      text;

-- The catalogue is read on every menu page load and filtered on these columns.
-- GIN handles the array/jsonb containment queries; btree the scalar equality.
create index if not exists dishes_course_idx        on dishes using gin (course);
create index if not exists dishes_tags_idx          on dishes using gin (tags);
create index if not exists dishes_occasion_idx      on dishes using gin (occasion_fit);
create index if not exists dishes_cuisine_group_idx on dishes (cuisine_group);
create index if not exists dishes_diet_idx          on dishes (diet);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id            uuid primary key default uuid_generate_v4(),
  client_name   text not null,
  client_email  text not null,
  -- The phone number is optional on the form, so an empty string is a valid
  -- value here. Defaulted rather than made nullable so every read gets a
  -- string and no caller has to null-check it.
  client_phone  text not null default '',
  event_name    text not null,
  event_type    text not null,
  status        text not null default 'submitted',
  created_at    timestamptz not null default now()
);

-- Added when optional Google sign-in landed. Null for a guest order, which is
-- the common case — signing in only pre-fills the contact step and lets the
-- customer find the order again later under /account/orders.
--
-- This column was live in the application (written by POST /api/orders, read by
-- the account page) before it was written down here, so a database built from
-- this file alone rejected every order insert. Keep the two in step.
alter table orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table orders alter column client_phone set default '';

-- Free text about the order as a whole — a dietary rule that governs the whole
-- menu ("we are a Jain family"), an allergy, venue access, a timing.
--
-- Nullable rather than defaulted to '', unlike client_phone above: this one has
-- a genuine difference between "said nothing" and "said something", and the
-- renderers all test for absence to decide whether to draw the block at all.
-- Distinct from meal_dishes.note, which is about one dish on one meal.
alter table orders add column if not exists notes text;

create index if not exists orders_user_id_idx on orders (user_id);

create table if not exists meals (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references orders(id) on delete cascade,
  name          text not null,
  date          date not null,
  time          time not null,
  location      text not null,
  total_guests  integer not null,
  veg_guests    integer not null
);

-- ON DELETE RESTRICT on dish_id is deliberate: a dish that appears in a past
-- order must not be deletable, or the order becomes unreadable. This is also
-- why dish ids are never re-slugged once published.
create table if not exists meal_dishes (
  id       uuid primary key default uuid_generate_v4(),
  meal_id  uuid not null references meals(id) on delete cascade,
  dish_id  text not null references dishes(id) on delete restrict,
  -- Free-text note the customer wrote against this dish for this order:
  -- spice, portion, substitutions. On the link row rather than on the dish,
  -- because it describes the order and not the dish.
  note     text,
  unique(meal_id, dish_id)
);

-- Added after the table shipped, so existing databases need it backfilled.
-- This file is the migration path: it is idempotent and safe to re-run.
alter table meal_dishes add column if not exists note text;

create index if not exists meals_order_id_idx      on meals (order_id);
create index if not exists meal_dishes_meal_id_idx on meal_dishes (meal_id);
create index if not exists orders_created_at_idx   on orders (created_at desc);

-- ---------------------------------------------------------------------------
-- Keep-alive
--
-- Supabase pauses a free-tier project after a week with no activity, which
-- would take the live menu down. .github/workflows/keep-supabase-alive.yml
-- PATCHes row 1 twice a week. It is a dedicated table so the ping can never
-- touch real data.
-- ---------------------------------------------------------------------------
create table if not exists keepalive (
  id         integer primary key,
  pinged_at  timestamptz not null default now()
);
insert into keepalive (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Reads are public and writes are not. Every write in the application goes
-- through the service-role key, which bypasses RLS altogether, so no table
-- needs an insert policy — and granting one grants it to `anon`, which is the
-- key shipped in the client bundle.
--
-- The three "Service role insert …" policies this file used to create did
-- exactly that. Named as though they scoped anything to the service role, they
-- were `with check (true)` for every role, so anyone holding the public anon
-- key could insert rows straight into orders, meals and meal_dishes without
-- going near the API route or its validation. They are dropped below.
--
-- Public SELECT on orders is deliberate and is the one thing to understand
-- here: the confirmation link is a capability URL. Anyone holding the order's
-- uuid can read it — that is what makes /order/[id] shareable and what lets
-- the emailed link work without a login. The uuid is the secret. Do not print
-- order ids anywhere they can be enumerated, and do not add a sequential id.
-- ---------------------------------------------------------------------------
alter table dishes      enable row level security;
alter table orders      enable row level security;
alter table meals       enable row level security;
alter table meal_dishes enable row level security;
alter table keepalive   enable row level security;

drop policy if exists "Service role insert orders"      on orders;
drop policy if exists "Service role insert meals"       on meals;
drop policy if exists "Service role insert meal_dishes" on meal_dishes;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'dishes' and policyname = 'Public read dishes') then
    create policy "Public read dishes" on dishes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'orders' and policyname = 'Public read orders') then
    create policy "Public read orders" on orders for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'meals' and policyname = 'Public read meals') then
    create policy "Public read meals" on meals for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'meal_dishes' and policyname = 'Public read meal_dishes') then
    create policy "Public read meal_dishes" on meal_dishes for select using (true);
  end if;
  -- The keep-alive workflow authenticates with the anon key, so its update is
  -- the one write in the whole schema that RLS actually has to permit.
  --
  -- Both policies are required, not just the update one: PostgreSQL applies
  -- SELECT policies to an UPDATE that reads existing rows, and the workflow
  -- filters on `?id=eq.1`. With only the UPDATE policy the PATCH matches zero
  -- rows and the ping silently stops keeping anything alive. The table holds
  -- one timestamp and nothing else, so a public read costs nothing.
  if not exists (select 1 from pg_policies where tablename = 'keepalive' and policyname = 'Public read keepalive') then
    create policy "Public read keepalive" on keepalive for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'keepalive' and policyname = 'Anon update keepalive') then
    create policy "Anon update keepalive" on keepalive for update using (true) with check (true);
  end if;
end $$;
