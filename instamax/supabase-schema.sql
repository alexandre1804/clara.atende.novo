-- InstaMax — Schema Supabase
-- Rodar no SQL Editor do Supabase

create table if not exists instagram_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  instagram_user_id text,
  username text,
  full_name text,
  bio text,
  followers_count integer default 0,
  following_count integer default 0,
  media_count integer default 0,
  profile_picture_url text,
  access_token text,
  token_expires_at timestamptz,
  raw_media jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  instagram_profile_id uuid references instagram_profiles(id),
  niche text not null,
  objective text not null,
  status text default 'pending' check (status in ('pending','processing','complete','failed')),
  analysis_data jsonb,
  payment_id text,
  created_at timestamptz default now()
);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  analysis_id uuid references analyses(id) on delete cascade,
  type text not null check (type in ('week','month')),
  status text default 'pending' check (status in ('pending','processing','complete','failed')),
  included_with_analysis boolean default false,
  schedule_data jsonb,
  payment_id text,
  created_at timestamptz default now()
);

create table if not exists generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  analysis_id uuid references analyses(id),
  schedule_id uuid references schedules(id),
  content_item_id text,
  prompt text not null,
  revised_prompt text,
  image_url text,
  storage_path text,
  payment_id text,
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  stripe_payment_id text unique,
  type text not null,
  amount integer,
  status text default 'pending',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- RLS
alter table instagram_profiles enable row level security;
alter table analyses enable row level security;
alter table schedules enable row level security;
alter table generated_images enable row level security;
alter table payments enable row level security;

create policy "Users see own instagram profile" on instagram_profiles for all using (auth.uid() = user_id);
create policy "Users see own analyses" on analyses for all using (auth.uid() = user_id);
create policy "Users see own schedules" on schedules for all using (auth.uid() = user_id);
create policy "Users see own images" on generated_images for all using (auth.uid() = user_id);
create policy "Users see own payments" on payments for select using (auth.uid() = user_id);
