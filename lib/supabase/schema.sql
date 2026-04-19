-- M G Prakash Catering — Supabase schema

create extension if not exists "uuid-ossp";

-- Dishes (seeded from food_db.json5)
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

-- Orders
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

-- Meals
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

-- Meal ↔ Dish junction
create table if not exists meal_dishes (
  id       uuid primary key default uuid_generate_v4(),
  meal_id  uuid not null references meals(id) on delete cascade,
  dish_id  text not null references dishes(id) on delete restrict,
  unique(meal_id, dish_id)
);

-- Row Level Security (permissive for now — auth added later)
alter table dishes enable row level security;
alter table orders enable row level security;
alter table meals enable row level security;
alter table meal_dishes enable row level security;

create policy "Public read dishes" on dishes for select using (true);
create policy "Service role insert orders" on orders for insert with check (true);
create policy "Service role insert meals" on meals for insert with check (true);
create policy "Service role insert meal_dishes" on meal_dishes for insert with check (true);
create policy "Public read orders" on orders for select using (true);
create policy "Public read meals" on meals for select using (true);
create policy "Public read meal_dishes" on meal_dishes for select using (true);
