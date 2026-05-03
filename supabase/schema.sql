-- Expense Tracker — Supabase schema
-- Paste this into the SQL editor at:
-- https://supabase.com/dashboard/project/qbjgwpypylntcqpwxbqv/sql/new
-- and click Run. Safe to run multiple times.

-- ---------- members ----------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists members_user_id_idx on public.members (user_id);

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create index if not exists categories_user_id_idx on public.categories (user_id);

-- ---------- expenses ----------
create table if not exists public.expenses (
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

create index if not exists expenses_user_id_idx on public.expenses (user_id);
create index if not exists expenses_date_idx on public.expenses (date);

-- ---------- Row-Level Security ----------
alter table public.members    enable row level security;
alter table public.categories enable row level security;
alter table public.expenses   enable row level security;

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
-- When a user signs up, give them two starter members + the standard 8 categories.
create or replace function public.seed_default_data_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.members (user_id, name) values
    (new.id, 'Me'),
    (new.id, 'Friend');

  insert into public.categories (user_id, name, color) values
    (new.id, 'Food',         '#f97316'),
    (new.id, 'Transport',    '#0ea5e9'),
    (new.id, 'Shopping',     '#ec4899'),
    (new.id, 'Bills',        '#8b5cf6'),
    (new.id, 'Entertainment','#10b981'),
    (new.id, 'Health',       '#ef4444'),
    (new.id, 'Travel',       '#6366f1'),
    (new.id, 'Other',        '#64748b');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_default_data_for_new_user();
