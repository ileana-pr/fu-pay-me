-- piri profiles table — payment methods for tip links
-- applied via: supabase db push

create table if not exists public.profiles (
  id text primary key,
  ethereum_address text,
  base_address text,
  bitcoin_address text,
  solana_address text,
  cash_app_cashtag text,
  venmo_username text,
  zelle_contact text,
  paypal_username text,
  created_at timestamptz default now()
);

-- RLS: public read (for tip page); insert/update via service role only (bypasses RLS)
alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);
