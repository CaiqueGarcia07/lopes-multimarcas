-- =============================================================================
-- Lopes Multimarcas — CRM (fase 6): automações
--   1. Modelos de mensagem do WhatsApp editáveis no CRM
--   2. Leads do formulário instantâneo do Meta Ads (CPF passa a ser opcional
--      só para eles; o site continua obrigado a enviar CPF)
--   3. Aviso em tempo real de ficha nova
--   4. Venda concluída marca o carro como vendido
--   5. Vínculo de cada carro com a tabela FIPE
--   6. Ranking mensal de usados (Fenauto)
--
-- Como usar: no painel do Supabase, abra "SQL Editor" > "New query",
-- cole este arquivo inteiro e clique em "Run". Pode rodar mais de uma vez.
-- Pré-requisito: fases anteriores (schema.sql até schema-crm-v5.sql).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Configurações do CRM (chave/valor). Hoje guarda os modelos do WhatsApp.
-- -----------------------------------------------------------------------------
create table if not exists public.crm_config (
  chave text primary key,
  dados jsonb not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

alter table public.crm_config enable row level security;

drop policy if exists "equipe_gerencia_crm_config" on public.crm_config;
create policy "equipe_gerencia_crm_config" on public.crm_config
  for all to authenticated
  using (true)
  with check (true);

revoke all on public.crm_config from anon;

-- -----------------------------------------------------------------------------
-- 2. Leads do Meta Ads
-- O formulário instantâneo normalmente não pede CPF, então a coluna deixa de
-- ser obrigatória no banco. A política do site público passa a exigir o CPF
-- explicitamente, mantendo a regra antiga para quem preenche a ficha no site.
-- -----------------------------------------------------------------------------
alter table public.propostas alter column cpf drop not null;

alter table public.propostas
  add column if not exists meta_lead_id text unique;

drop policy if exists "anon_insert_only" on public.propostas;
create policy "anon_insert_only" on public.propostas
  for insert to anon
  with check (consentimento_autorizado = true and cpf is not null);

create index if not exists propostas_origem_idx on public.propostas (origem);

-- -----------------------------------------------------------------------------
-- 3. Tempo real: o CRM recebe um aviso quando entra ficha nova.
-- A RLS continua valendo: só a equipe logada recebe os eventos.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'propostas'
  ) then
    alter publication supabase_realtime add table public.propostas;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 4. Venda concluída → carro vendido
-- Quando a ficha vai para "convertido" com um carro vinculado, o carro sai
-- do estoque disponível (e da vitrine do site) sozinho.
-- -----------------------------------------------------------------------------
create or replace function public.marcar_veiculo_vendido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'convertido'
     and new.veiculo_id is not null
     and (old.status is distinct from 'convertido' or old.veiculo_id is distinct from new.veiculo_id) then
    update public.veiculos
       set status = 'vendido'
     where id = new.veiculo_id
       and status <> 'vendido';
  end if;
  return new;
end;
$$;

drop trigger if exists propostas_venda_marca_veiculo on public.propostas;
create trigger propostas_venda_marca_veiculo
  after update of status, veiculo_id on public.propostas
  for each row
  execute function public.marcar_veiculo_vendido();

-- -----------------------------------------------------------------------------
-- 5. FIPE do veículo
-- Formato: { "marca": {"codigo": "21", "nome": "Fiat"},
--            "modelo": {"codigo": 9984, "nome": "ARGO DRIVE 1.0 6V Flex"},
--            "ano": {"codigo": "2025-1", "nome": "2025 Gasolina"},
--            "valor_centavos": 7150000, "codigo_fipe": "001486-0",
--            "referencia": "novembro de 2026", "consultado_em": "..." }
-- Não entra na vitrine pública (o anon só lê as colunas liberadas na fase 3).
-- -----------------------------------------------------------------------------
alter table public.veiculos
  add column if not exists fipe jsonb;

-- -----------------------------------------------------------------------------
-- 6. Mercado de usados — um registro por mês, com o top 10 da Fenauto.
-- -----------------------------------------------------------------------------
create table if not exists public.mercado_mensal (
  mes date primary key,                 -- sempre o dia 1 do mês
  total_autos_comerciais integer,       -- automóveis + comerciais leves
  total_geral integer,                  -- todas as categorias, com motos e pesados
  variacao_mes_pct numeric(5, 1),
  variacao_ano_pct numeric(5, 1),
  ranking jsonb not null default '[]'::jsonb,  -- [{ "posicao": 1, "modelo": "Volkswagen Gol", "unidades": 62635 }]
  fonte text,
  fonte_url text,
  atualizado_em timestamptz not null default now()
);

alter table public.mercado_mensal enable row level security;

drop policy if exists "equipe_gerencia_mercado" on public.mercado_mensal;
create policy "equipe_gerencia_mercado" on public.mercado_mensal
  for all to authenticated
  using (true)
  with check (true);

revoke all on public.mercado_mensal from anon;

insert into public.mercado_mensal
  (mes, total_autos_comerciais, total_geral, variacao_mes_pct, variacao_ano_pct, ranking, fonte, fonte_url)
values (
  '2026-10-01', 1185372, 1606314, -3.6, -9.4,
  '[
    {"posicao": 1,  "modelo": "Volkswagen Gol",     "unidades": 62635},
    {"posicao": 2,  "modelo": "Chevrolet Onix",     "unidades": 39719},
    {"posicao": 3,  "modelo": "Fiat Strada",        "unidades": 39023},
    {"posicao": 4,  "modelo": "Hyundai HB20",       "unidades": 38432},
    {"posicao": 5,  "modelo": "Fiat Palio",         "unidades": 32582},
    {"posicao": 6,  "modelo": "Fiat Uno",           "unidades": 31514},
    {"posicao": 7,  "modelo": "Toyota Corolla",     "unidades": 25963},
    {"posicao": 8,  "modelo": "Ford Ka",            "unidades": 24023},
    {"posicao": 9,  "modelo": "Volkswagen Saveiro", "unidades": 23252},
    {"posicao": 10, "modelo": "Ford Fiesta",        "unidades": 22871}
  ]'::jsonb,
  'Fenauto',
  'https://www.bnewssaopaulo.com.br/noticias/negocios/volkswagen-gol-dispara-veja-os-10-carros-usados-mais-vendidos-do-brasil-em-outubro.html'
)
on conflict (mes) do nothing;
