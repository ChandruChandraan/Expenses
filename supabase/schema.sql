-- Expense Tracker — Supabase schema
-- Paste this into the SQL editor at:
-- https://supabase.com/dashboard/project/qbjgwpypylntcqpwxbqv/sql/new
-- and click Run. Safe to run multiple times — it drops and recreates everything.

-- ---------- clean slate ----------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.seed_default_data_for_new_user();
drop table if exists public.expenses   cascade;
drop table if exists public.categories cascade;
drop table if exists public.members    cascade;
drop table if exists public.profiles   cascade;

-- ---------- profiles ----------
-- 1 row per auth user. Auto-created by the on_auth_user_created trigger.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  phone text not null default '',
  avatar_url text not null default '',
  default_currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- members ----------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index members_user_id_idx on public.members (user_id);

-- ---------- categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create index categories_user_id_idx on public.categories (user_id);

-- ---------- expenses ----------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(14, 2) not null,
  description text not null default '',
  category_id uuid not null references public.categories (id) on delete restrict,
  date date not null,
  paid_by uuid not null references public.members (id) on delete restrict,
  split_among uuid[] not null default '{}',
  settled_by uuid[] not null default '{}',
  shares jsonb,
  created_at timestamptz not null default now()
);

create index expenses_user_id_idx on public.expenses (user_id);
create index expenses_date_idx on public.expenses (date);

-- ---------- Row-Level Security ----------
alter table public.profiles   enable row level security;
alter table public.members    enable row level security;
alter table public.categories enable row level security;
alter table public.expenses   enable row level security;

-- profiles
drop policy if exists "profiles: owner can read"   on public.profiles;
drop policy if exists "profiles: owner can insert" on public.profiles;
drop policy if exists "profiles: owner can update" on public.profiles;

create policy "profiles: owner can read"   on public.profiles for select using  (auth.uid() = id);
create policy "profiles: owner can insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: owner can update" on public.profiles for update using  (auth.uid() = id) with check (auth.uid() = id);

-- members
drop policy if exists "members: owner can read"   on public.members;
drop policy if exists "members: owner can insert" on public.members;
drop policy if exists "members: owner can update" on public.members;
drop policy if exists "members: owner can delete" on public.members;

create policy "members: owner can read"   on public.members for select using  (auth.uid() = user_id);
create policy "members: owner can insert" on public.members for insert with check (auth.uid() = user_id);
create policy "members: owner can update" on public.members for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "members: owner can delete" on public.members for delete using  (auth.uid() = user_id);

-- categories
drop policy if exists "categories: owner can read"   on public.categories;
drop policy if exists "categories: owner can insert" on public.categories;
drop policy if exists "categories: owner can update" on public.categories;
drop policy if exists "categories: owner can delete" on public.categories;

create policy "categories: owner can read"   on public.categories for select using  (auth.uid() = user_id);
create policy "categories: owner can insert" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories: owner can update" on public.categories for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories: owner can delete" on public.categories for delete using  (auth.uid() = user_id);

-- expenses
drop policy if exists "expenses: owner can read"   on public.expenses;
drop policy if exists "expenses: owner can insert" on public.expenses;
drop policy if exists "expenses: owner can update" on public.expenses;
drop policy if exists "expenses: owner can delete" on public.expenses;

create policy "expenses: owner can read"   on public.expenses for select using  (auth.uid() = user_id);
create policy "expenses: owner can insert" on public.expenses for insert with check (auth.uid() = user_id);
create policy "expenses: owner can update" on public.expenses for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses: owner can delete" on public.expenses for delete using  (auth.uid() = user_id);

-- ---------- Default seed for new users ----------
-- When a user signs up: create their profile row, give them two starter
-- members ("Me", "Friend") + the standard 14 categories.
create or replace function public.seed_default_data_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), ''));

  insert into public.members (user_id, name) values
    (new.id, 'Me'),
    (new.id, 'Friend');

  insert into public.categories (user_id, name, color) values
    (new.id, 'Food',          '#f97316'),
    (new.id, 'Transport',     '#0ea5e9'),
    (new.id, 'Shopping',      '#ec4899'),
    (new.id, 'Bills',         '#8b5cf6'),
    (new.id, 'Entertainment', '#10b981'),
    (new.id, 'Health',        '#ef4444'),
    (new.id, 'Travel',        '#6366f1'),
    (new.id, 'Groceries',     '#14b8a6'),
    (new.id, 'Rent',          '#facc15'),
    (new.id, 'Fuel',          '#22c55e'),
    (new.id, 'Subscriptions', '#a855f7'),
    (new.id, 'Investments',   '#0891b2'),
    (new.id, 'Education',     '#d946ef'),
    (new.id, 'Other',         '#64748b');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_default_data_for_new_user();

-- ---------- updated_at touch trigger for profiles ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- avatars storage bucket ----------
-- Public-read so <img src=...> works without signed URLs.
-- Owner-only writes are enforced by the RLS policies below.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars: public read"            on storage.objects;
drop policy if exists "avatars: owner can upload"       on storage.objects;
drop policy if exists "avatars: owner can update"       on storage.objects;
drop policy if exists "avatars: owner can delete"       on storage.objects;

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Files must be uploaded under {auth.uid}/... to enforce per-user isolation.
create policy "avatars: owner can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: owner can update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: owner can delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
