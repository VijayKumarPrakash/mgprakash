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
  client_phone  text not null,
  event_name    text not null,
  event_type    text not null,
  status        text not null default 'submitted',
  created_at    timestamptz not null default now()
);

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
  unique(meal_id, dish_id)
);

create index if not exists meals_order_id_idx      on meals (order_id);
create index if not exists meal_dishes_meal_id_idx on meal_dishes (meal_id);
create index if not exists orders_created_at_idx   on orders (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table dishes      enable row level security;
alter table orders      enable row level security;
alter table meals       enable row level security;
alter table meal_dishes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'dishes' and policyname = 'Public read dishes') then
    create policy "Public read dishes" on dishes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'orders' and policyname = 'Service role insert orders') then
    create policy "Service role insert orders" on orders for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'meals' and policyname = 'Service role insert meals') then
    create policy "Service role insert meals" on meals for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'meal_dishes' and policyname = 'Service role insert meal_dishes') then
    create policy "Service role insert meal_dishes" on meal_dishes for insert with check (true);
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
end $$;
