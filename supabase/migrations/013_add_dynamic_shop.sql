-- Migration: 013_add_dynamic_shop
-- Description: Creates the shop_items table for AI-generated dynamic real-life rewards

create table public.shop_items (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    description text not null,
    cost integer not null,
    category text not null check (category in ('food_drink', 'entertainment', 'self_care', 'learning', 'gear', 'experience', 'digital', 'social')),
    expires_at timestamp with time zone not null,
    is_purchased boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for shop_items
alter table public.shop_items enable row level security;

create policy "Users can view own shop items"
    on public.shop_items for select
    using (auth.uid() = user_id);

create policy "Users can insert own shop items"
    on public.shop_items for insert
    with check (auth.uid() = user_id);

create policy "Users can update own shop items"
    on public.shop_items for update
    using (auth.uid() = user_id);

-- Optional: index for querying active shop items
create index shop_items_user_id_expires_at_idx on public.shop_items(user_id, expires_at);
