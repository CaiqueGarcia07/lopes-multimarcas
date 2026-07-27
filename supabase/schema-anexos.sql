-- =============================================================================
-- Lopes Multimarcas — Anexos das fichas (imagens e PDFs)
--
-- Como usar: no painel do Supabase, abra "SQL Editor" > "New query",
-- cole este arquivo inteiro e clique em "Run".
-- Pré-requisito: schema-crm.sql já executado.
-- =============================================================================

-- Bucket privado: nenhum arquivo é acessível sem login (URLs assinadas de 1h).
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false);

-- Equipe logada gerencia os anexos; o site público (anon) não tem acesso.
create policy "equipe_le_anexos" on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos');

create policy "equipe_sobe_anexos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos');

create policy "equipe_atualiza_anexos" on storage.objects
  for update to authenticated
  using (bucket_id = 'anexos');

create policy "equipe_apaga_anexos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos');
