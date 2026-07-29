-- =============================================================================
-- Lopes Multimarcas — CRM (fase 4)
-- Fotos dos veículos: coluna na tabela + bucket público no Storage.
--
-- Como usar: no painel do Supabase, abra "SQL Editor" > "New query",
-- cole este arquivo inteiro e clique em "Run".
-- Pré-requisito: schema.sql, schema-crm.sql e schema-crm-v3.sql já executados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Lista de fotos do veículo. Guardamos só o caminho no Storage; a URL pública
-- é montada na hora de exibir.
-- Formato de cada item: { "path": "<id-do-veiculo>/1730000000-frente.jpg" }
-- A primeira foto da lista é a capa usada na galeria.
-- -----------------------------------------------------------------------------
alter table public.veiculos
  add column if not exists fotos jsonb not null default '[]'::jsonb;

alter table public.veiculos
  drop constraint if exists veiculos_fotos_lista;

alter table public.veiculos
  add constraint veiculos_fotos_lista check (jsonb_typeof(fotos) = 'array');

-- A vitrine pública do formulário também pode mostrar a capa do carro.
grant select (fotos) on public.veiculos to anon;

-- -----------------------------------------------------------------------------
-- Bucket das fotos. Diferente do bucket "anexos" (documentos de clientes,
-- privado): foto de carro é material de vitrine, então o bucket é público.
-- Nunca envie documento de cliente para cá.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('veiculos', 'veiculos', true)
on conflict (id) do update set public = true;

drop policy if exists "fotos_veiculos_leitura_publica" on storage.objects;
drop policy if exists "fotos_veiculos_equipe_envia" on storage.objects;
drop policy if exists "fotos_veiculos_equipe_atualiza" on storage.objects;
drop policy if exists "fotos_veiculos_equipe_apaga" on storage.objects;

create policy "fotos_veiculos_leitura_publica" on storage.objects
  for select to public
  using (bucket_id = 'veiculos');

create policy "fotos_veiculos_equipe_envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'veiculos');

create policy "fotos_veiculos_equipe_atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'veiculos');

create policy "fotos_veiculos_equipe_apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'veiculos');
