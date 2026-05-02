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

-- ─── Créditos de imagem ────────────────────────────────────────────────────

create table if not exists user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  balance integer not null default 0,
  updated_at timestamptz default now()
);

create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('purchase', 'debit', 'bonus')),
  amount integer not null,
  description text,
  created_at timestamptz default now()
);

alter table user_credits enable row level security;
alter table credit_transactions enable row level security;
create policy "Users see own credits" on user_credits for select using (auth.uid() = user_id);
create policy "Users see own transactions" on credit_transactions for select using (auth.uid() = user_id);

-- Adiciona créditos atomicamente (usado pelo webhook do Stripe)
create or replace function add_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text default 'purchase',
  p_description text default null
) returns void as $$
begin
  insert into user_credits (user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id) do update
  set balance = user_credits.balance + p_amount,
      updated_at = now();

  insert into credit_transactions (user_id, type, amount, description)
  values (p_user_id, p_type, p_amount, p_description);
end;
$$ language plpgsql security definer;

-- Debita 1 crédito atomicamente (usado pela API de geração de imagem)
-- Retorna true se havia saldo, false se não havia
create or replace function deduct_credit(
  p_user_id uuid,
  p_description text default null
) returns boolean as $$
declare
  v_balance integer;
begin
  select balance into v_balance
  from user_credits
  where user_id = p_user_id
  for update;

  if v_balance is null or v_balance < 1 then
    return false;
  end if;

  update user_credits
  set balance = balance - 1, updated_at = now()
  where user_id = p_user_id;

  insert into credit_transactions (user_id, type, amount, description)
  values (p_user_id, 'debit', -1, p_description);

  return true;
end;
$$ language plpgsql security definer;
