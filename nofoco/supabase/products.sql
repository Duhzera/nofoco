-- Tabela de produtos por código de barras (cache compartilhado do Open Food Facts).
-- Rode no Supabase → SQL Editor. Ver src/services/products.ts e PLANEJAMENTO_APP.md §4.4.1.
--
-- É um cache PÚBLICO e não sensível: qualquer um lê (a base cresce com o uso de todos),
-- mas só usuário autenticado escreve (reduz spam). O app usa a chave anon/publishable;
-- as políticas de RLS abaixo é que definem o que cada um pode fazer.

create table if not exists public.products (
  barcode     text primary key,
  name        text not null,
  brand       text,
  per100      jsonb not null,               -- mesmo formato do Nutrients (por 100 g/ml)
  unit_grams  numeric not null default 100,
  unit_label  text not null default 'porção (100 g)',
  liquid      boolean not null default false,
  source      text not null default 'Open Food Facts',
  image_url   text,
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

-- leitura liberada para todos (anon + logados)
drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select using (true);

-- escrita (inserir/atualizar o cache) só para usuários autenticados
drop policy if exists products_insert_auth on public.products;
create policy products_insert_auth on public.products
  for insert to authenticated with check (true);

drop policy if exists products_update_auth on public.products;
create policy products_update_auth on public.products
  for update to authenticated using (true) with check (true);
