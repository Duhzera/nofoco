-- Schema de sincronização do NoFoco (perfil, refeições, peso, diário, receitas e favoritos por usuário).
-- Rode no Supabase → SQL Editor. Ver src/services/sync.ts e PLANEJAMENTO_APP.md §E9.
--
-- Cada linha pertence a um usuário (user_id = auth.uid()). As políticas de RLS
-- garantem que cada pessoa só enxerga e escreve os próprios dados. O app usa a chave
-- anon/publishable; a proteção real são estas políticas.
--
-- Modelo de sync (v1): o aparelho é a cópia de trabalho; o remoto é um espelho.
-- push = o app envia o estado local inteiro (upsert + apaga o que não existe mais);
-- pull = o app baixa tudo e substitui o local. Conflito = último a escrever vence.

-- ─────────────────────────────── PERFIL ───────────────────────────────
create table if not exists public.profiles (
  user_id           uuid primary key references auth.users on delete cascade,
  sex               text,
  age               int,
  height_cm         numeric,
  weight_kg         numeric,
  activity          text,
  objective         text,
  target_weight_kg  numeric,
  weekly_rate_kg    numeric,
  custom_macros     jsonb,
  onboarded         boolean not null default true,
  updated_at        timestamptz not null default now()
);

-- Garante que colunas adicionadas em versões posteriores existam mesmo se a tabela já foi criada antes
alter table public.profiles add column if not exists target_weight_kg numeric;
alter table public.profiles add column if not exists weekly_rate_kg numeric;
alter table public.profiles add column if not exists custom_macros jsonb;

-- ───────────────────────────── REFEIÇÕES ──────────────────────────────
create table if not exists public.meals (
  user_id     uuid not null references auth.users on delete cascade,
  meal_id     text not null,
  name        text not null,
  time        text not null,          -- 'HH:MM'
  emoji       text not null,
  pct         numeric not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, meal_id)
);

-- ─────────────────────────────── PESO ─────────────────────────────────
create table if not exists public.weight_log (
  user_id     uuid not null references auth.users on delete cascade,
  date        text not null,          -- 'YYYY-MM-DD' (local, ver lib/date)
  kg          numeric not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);

-- ─────────────────────────────── DIÁRIO ───────────────────────────────
create table if not exists public.diary_items (
  user_id       uuid not null references auth.users on delete cascade,
  item_id       text not null,
  day           text not null,        -- 'YYYY-MM-DD'
  meal_id       text not null,
  food_id       text,
  name          text not null,
  emoji         text,
  grams         numeric not null,
  portion_label text,
  macros        jsonb not null,       -- snapshot dos nutrientes (ver Nutrients)
  updated_at    timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index if not exists diary_items_user_day on public.diary_items (user_id, day);

-- ─────────────────────────────── RECEITAS ──────────────────────────────
create table if not exists public.recipes (
  user_id           uuid not null references auth.users on delete cascade,
  recipe_id         text not null,
  name              text not null,
  emoji             text not null default '🍳',
  cooked_weight_g   numeric,
  portions          int not null default 1,
  portion_name      text not null default 'fatia',
  ingredients       jsonb not null,
  updated_at        timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- ─────────────────────────────── FAVORITOS ─────────────────────────────
create table if not exists public.favorites (
  user_id     uuid not null references auth.users on delete cascade,
  food_id     text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, food_id)
);

-- ───────────────────────── ROW LEVEL SECURITY ─────────────────────────
-- Mesma política para todas as tabelas: dono total sobre as próprias linhas.
alter table public.profiles     enable row level security;
alter table public.meals        enable row level security;
alter table public.weight_log   enable row level security;
alter table public.diary_items  enable row level security;
alter table public.recipes      enable row level security;
alter table public.favorites    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','meals','weight_log','diary_items','recipes','favorites'] loop
    execute format('drop policy if exists %I_owner on public.%I', t, t);
    execute format(
      'create policy %I_owner on public.%I
         for all
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)', t, t);
  end loop;
end $$;

-- ────────────────────── DIREITO AO ESQUECIMENTO (LGPD) ─────────────────────
-- Permite que o usuário autenticado exclua a própria conta e todos os seus dados.
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Usuário não autenticado.';
  end if;

  -- 1. Apaga dados nas tabelas da aplicação
  delete from public.profiles where user_id = uid;
  delete from public.meals where user_id = uid;
  delete from public.weight_log where user_id = uid;
  delete from public.diary_items where user_id = uid;
  delete from public.recipes where user_id = uid;
  delete from public.favorites where user_id = uid;

  -- 2. Apaga o registro de autenticação
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;
