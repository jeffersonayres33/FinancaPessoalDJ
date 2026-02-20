-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Table: app_users
create table public.app_users (
  id uuid primary key, -- Maps to auth.users.id for main users, or uuidv4 for members
  name text not null,
  email text,
  password text, -- Placeholder, not used for auth
  parent_id uuid references public.app_users(id),
  data_context_id uuid not null,
  created_at timestamp with time zone default now()
);

-- 2. Table: categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income', 'expense', 'both')),
  budget numeric default 0,
  data_context_id uuid not null,
  created_at timestamp with time zone default now()
);

-- 3. Table: transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  category text, -- Can be category ID or name
  status text not null check (status in ('paid', 'pending')),
  date date not null,
  payment_date date,
  observation text,
  installments jsonb,
  data_context_id uuid not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table public.app_users enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- Policies for app_users
-- Allow users to view their own profile and profiles they manage (members)
create policy "Users can view own profile and members"
  on public.app_users for select
  using (auth.uid() = id or auth.uid() = parent_id);

-- Allow users to insert their own profile (during registration) or members
create policy "Users can insert own profile or members"
  on public.app_users for insert
  with check (auth.uid() = id or auth.uid() = parent_id);

-- Allow users to update their own profile or members
create policy "Users can update own profile or members"
  on public.app_users for update
  using (auth.uid() = id or auth.uid() = parent_id);

-- Policies for categories
-- Access based on data_context_id ownership
-- You can access data if the context ID is YOUR ID, or if the context ID belongs to a member YOU manage.
create policy "Users can manage categories in their context"
  on public.categories for all
  using (
    data_context_id = auth.uid() 
    or exists (
      select 1 from public.app_users 
      where id = categories.data_context_id 
      and parent_id = auth.uid()
    )
  );

-- Policies for transactions
create policy "Users can manage transactions in their context"
  on public.transactions for all
  using (
    data_context_id = auth.uid() 
    or exists (
      select 1 from public.app_users 
      where id = transactions.data_context_id 
      and parent_id = auth.uid()
    )
  );

-- Optional: Create a trigger to automatically create app_users entry on auth.users signup?
-- The current code handles this manually in authService.register, so we skip the trigger for now to avoid conflicts.
