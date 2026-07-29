-- =============================================================================
-- Lopes Multimarcas — CRM (fase 3)
-- Ficha técnica do veículo, gastos por veículo e vitrine pública do estoque.
--
-- Como usar: no painel do Supabase, abra "SQL Editor" > "New query",
-- cole este arquivo inteiro e clique em "Run".
-- Pré-requisito: schema.sql (fase 1) e schema-crm.sql (fase 2) já executados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ficha técnica do veículo
-- -----------------------------------------------------------------------------
alter table public.veiculos
  add column if not exists ano_fabricacao text,
  add column if not exists carroceria text,
  add column if not exists combustivel text,
  add column if not exists cambio text;

-- -----------------------------------------------------------------------------
-- Gastos do veículo (manutenção mecânica, estética, peças, documentação...).
-- Guardados como JSONB: a lista vive junto do veículo e é sempre lida inteira,
-- então não compensa uma tabela separada.
-- Formato de cada item:
--   { "id": "g-1", "tipo": "Mecânica", "descricao": "Troca de embreagem",
--     "valor_centavos": 120000, "data": "2026-07-29" }
-- -----------------------------------------------------------------------------
alter table public.veiculos
  add column if not exists gastos jsonb not null default '[]'::jsonb;

alter table public.veiculos
  drop constraint if exists veiculos_gastos_lista;

alter table public.veiculos
  add constraint veiculos_gastos_lista check (jsonb_typeof(gastos) = 'array');

-- -----------------------------------------------------------------------------
-- Vitrine pública: o formulário deixa o cliente escolher o carro da simulação.
-- O site (anon) enxerga SOMENTE veículos disponíveis e SOMENTE as colunas da
-- vitrine — preço de custo, gastos e observações internas continuam invisíveis.
-- -----------------------------------------------------------------------------
drop policy if exists "anon_le_vitrine" on public.veiculos;

create policy "anon_le_vitrine" on public.veiculos
  for select to anon
  using (status = 'disponivel');

grant select (id, nome, placa, cor, ano_modelo, ano_fabricacao, carroceria, combustivel, cambio, km, preco_centavos, status)
  on public.veiculos to anon;

-- -----------------------------------------------------------------------------
-- Seed opcional: ficha técnica do estoque atual, por placa.
-- Rode apenas se o estoque ainda for o importado em 27/07/2026.
-- -----------------------------------------------------------------------------
update public.veiculos as v
set carroceria = d.carroceria,
    combustivel = d.combustivel,
    cambio = d.cambio,
    ano_fabricacao = d.ano_fabricacao
from (values
  ('TCM8D92', 'Hatch',  'Flex', 'Manual',     '2024'),
  ('TCL2A96', 'Hatch',  'Flex', 'Manual',     '2024'),
  ('SYF8J37', 'Sedan',  'Flex', 'Manual',     '2024'),
  ('EUL3G15', 'Hatch',  'Flex', 'Manual',     '2010'),
  ('FSD0J26', 'Hatch',  'Flex', 'Manual',     '2014'),
  ('FWT7804', 'Hatch',  'Flex', 'Manual',     '2015'),
  ('EFP3689', 'Hatch',  'Flex', 'Manual',     '2008'),
  ('PXW6452', 'Sedan',  'Flex', 'Manual',     '2016'),
  ('EST4263', 'Sedan',  'Flex', 'Automático', '2018'),
  ('DFJ1D78', 'SUV',    'Flex', 'Automático', '2020'),
  ('RVZ5F40', 'Hatch',  'Flex', 'Manual',     '2023'),
  ('SYH6D72', 'Hatch',  'Flex', 'Manual',     '2023'),
  ('QXX3B65', 'Sedan',  'Flex', 'Manual',     '2020'),
  ('ETO9G00', 'Hatch',  'Flex', 'Automático', '2010'),
  ('FHB6153', 'SUV',    'Flex', 'Manual',     '2012'),
  ('FJK5J64', 'Hatch',  'Flex', 'Manual',     '2013')
) as d (placa, carroceria, combustivel, cambio, ano_fabricacao)
where v.placa = d.placa;
