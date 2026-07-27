-- =============================================================================
-- Lopes Multimarcas — CRM (fase 2)
-- Estoque de veículos, follow-ups e campos de negociação nas propostas.
--
-- Como usar: no painel do Supabase, abra "SQL Editor" > "New query",
-- cole este arquivo inteiro e clique em "Run".
-- Pré-requisito: schema.sql (fase 1) já executado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Estoque de veículos
-- -----------------------------------------------------------------------------
create table public.veiculos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                -- ex.: "FIAT / ARGO DRIVE 1.0 6V FLEX"
  placa text unique,
  km integer,
  preco_centavos bigint,
  cor text,
  ano_modelo text,                   -- ex.: "2024/2025"
  status text not null default 'disponivel'
    check (status in ('disponivel', 'reservado', 'vendido')),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger veiculos_atualizado_em
  before update on public.veiculos
  for each row
  execute function public.set_atualizado_em();

-- -----------------------------------------------------------------------------
-- Campos de negociação na proposta (preenchidos pelo lojista no CRM)
-- -----------------------------------------------------------------------------
alter table public.propostas
  add column veiculo_id uuid references public.veiculos (id) on delete set null,
  add column valor_venda_centavos bigint,
  add column valor_entrada_centavos bigint,
  add column instituicao_financeira text,
  add column indicacao text,
  add column regiao text;

create index propostas_veiculo_idx on public.propostas (veiculo_id);

-- -----------------------------------------------------------------------------
-- Follow-ups: histórico de contatos e mudanças de status de cada ficha
-- -----------------------------------------------------------------------------
create table public.followups (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.propostas (id) on delete cascade,
  autor text,                        -- e-mail do usuário do CRM
  nota text,
  status_anterior text,
  status_novo text,
  criado_em timestamptz not null default now()
);

create index followups_proposta_idx on public.followups (proposta_id, criado_em desc);

-- -----------------------------------------------------------------------------
-- Segurança: equipe logada (authenticated) gerencia tudo;
-- o site público (anon) continua apenas inserindo fichas.
-- -----------------------------------------------------------------------------
alter table public.veiculos enable row level security;
alter table public.followups enable row level security;

create policy "equipe_gerencia_propostas" on public.propostas
  for all to authenticated
  using (true)
  with check (true);

create policy "equipe_gerencia_veiculos" on public.veiculos
  for all to authenticated
  using (true)
  with check (true);

create policy "equipe_gerencia_followups" on public.followups
  for all to authenticated
  using (true)
  with check (true);

-- anon não enxerga estoque nem follow-ups
revoke all on public.veiculos from anon;
revoke all on public.followups from anon;

-- -----------------------------------------------------------------------------
-- Seed: estoque atual (importado do Notion "ESTOQUE DETALHADO" em 27/07/2026)
-- -----------------------------------------------------------------------------
insert into public.veiculos (nome, placa, km, preco_centavos, cor, ano_modelo) values
  ('FIAT / ARGO DRIVE 1.0 6V FLEX',                        'TCM8D92', 57653,  7390000,  'Branco', '2025'),
  ('FIAT / ARGO DRIVE 1.0 6V FLEX',                        'TCL2A96', 57301,  7390000,  'Cinza',  '2024/2025'),
  ('FIAT / CRONOS DRIVE 1.0 6V FLEX',                      'SYF8J37', 113873, 7790000,  'Prata',  '2024'),
  ('FORD / FIESTA 1.6 8V FLEX/CLASS 1.6 8V FLEX 5P',       'EUL3G15', 221894, 3190000,  'Preto',  '2010/2011'),
  ('FORD / FIESTA 1.6 16V FLEX MEC. 5P',                   'FSD0J26', 204416, 3890000,  'Preto',  '2014'),
  ('GM - CHEVROLET / CELTA SPIRIT/ LT 1.0 MPFI 8V FLEXP. 5P', 'FWT7804', null, 3790000, 'Branco', '2015'),
  ('GM - CHEVROLET / CORSA HAT. PREMIUM 1.4 8V ECONOFLEX 5P', 'EFP3689', 228733, 3090000, 'Cinza', '2008/2009'),
  ('GM - CHEVROLET / PRISMA SED. LT 1.4 8V FLEXPOWER 4P',  'PXW6452', 139264, 5390000,  'Branco', '2016'),
  ('HONDA / CITY SEDAN EXL 1.5 FLEX 16V 4P AUT.',          'EST4263', 75581,  8690000,  'Prata',  '2018/2019'),
  ('HONDA / HR-V EX 1.8 FLEXONE 16V 5P AUT.',              'DFJ1D78', 83256,  10790000, 'Branco', '2020'),
  ('HYUNDAI / HB20 SENSE 1.0 FLEX 12V MEC.',               'RVZ5F40', 57260,  6590000,  'Branco', '2023'),
  ('HYUNDAI / HB20 SENSE PLUS 1.0 FLEX 12V MEC.',          'SYH6D72', 58455,  6890000,  'Prata',  '2023/2024'),
  ('HYUNDAI / HB20S VISION 1.0 FLEX 12V MEC.',             'QXX3B65', 74519,  6290000,  'Preto',  '2020'),
  ('HYUNDAI / I30 2.0 16V 145CV 5P AUT.',                  'ETO9G00', 173524, 4990000,  'Preto',  '2010/2011'),
  ('HYUNDAI / IX35 2.0 16V 2WD FLEX MEC.',                 'FHB6153', 118814, 6690000,  'Preto',  '2012/2013'),
  ('RENAULT / SANDERO STEPWAY HI-POWER 1.6 8V 5P',         'FJK5J64', 132859, 4190000,  'Branco', '2013');
