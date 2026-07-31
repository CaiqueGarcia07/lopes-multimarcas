-- =============================================================================
-- Lopes Multimarcas — CRM (fase 5)
-- Perfis de acesso (admin x equipe) e configuração do formulário público.
--
-- Como usar: no painel do Supabase, abra "SQL Editor" > "New query",
-- cole este arquivo inteiro e clique em "Run".
-- IMPORTANTE: troque o e-mail do primeiro admin no final do arquivo.
-- Pré-requisito: schema.sql, schema-crm.sql, schema-crm-v3.sql e -v4.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Quem é quem. "equipe" usa o CRM; "admin" também configura o formulário.
-- -----------------------------------------------------------------------------
create table if not exists public.perfis (
  email text primary key,
  papel text not null default 'equipe' check (papel in ('admin', 'equipe')),
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

-- Função usada pelas policies. SECURITY DEFINER evita recursão de RLS ao
-- consultar a própria tabela de perfis dentro da policy.
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where email = (auth.jwt() ->> 'email') and papel = 'admin'
  );
$$;

drop policy if exists "equipe_le_perfis" on public.perfis;
drop policy if exists "admin_gerencia_perfis" on public.perfis;

-- Toda a equipe logada pode ler os perfis (para saber o próprio papel).
create policy "equipe_le_perfis" on public.perfis
  for select to authenticated
  using (true);

-- Só admin cria, muda ou remove perfis.
create policy "admin_gerencia_perfis" on public.perfis
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

-- -----------------------------------------------------------------------------
-- Configuração do formulário público: uma única linha em JSONB.
-- Guarda visibilidade, obrigatoriedade, rótulo e ordem das seções.
-- -----------------------------------------------------------------------------
create table if not exists public.form_config (
  id smallint primary key default 1 check (id = 1),
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

insert into public.form_config (id, dados) values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.form_config enable row level security;

drop policy if exists "todos_leem_config" on public.form_config;
drop policy if exists "admin_edita_config" on public.form_config;

-- O site público precisa ler a configuração para montar o formulário.
create policy "todos_leem_config" on public.form_config
  for select to anon, authenticated
  using (true);

-- Só admin altera.
create policy "admin_edita_config" on public.form_config
  for update to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

grant select on public.form_config to anon;

-- -----------------------------------------------------------------------------
-- Primeiro admin. TROQUE O E-MAIL abaixo pelo seu (o mesmo cadastrado em
-- Authentication → Users). Sem isso ninguém enxerga a aba Administração.
-- -----------------------------------------------------------------------------
insert into public.perfis (email, papel)
values ('troque-por-seu-email@lopesmultimarcas.com.br', 'admin')
on conflict (email) do update set papel = 'admin';
