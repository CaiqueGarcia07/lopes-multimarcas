-- =============================================================================
-- Lopes Multimarcas — Ficha Cadastral
-- Schema da tabela de propostas (leads) no Supabase
--
-- Como usar: no painel do Supabase, abra "SQL Editor" > "New query",
-- cole este arquivo inteiro e clique em "Run".
-- =============================================================================

create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,

  -- Situação do cliente no funil (base do futuro CRM)
  status text not null default 'novo'
    check (status in ('novo', 'em_analise', 'aprovado', 'reprovado', 'contatado', 'convertido', 'arquivado')),

  -- Colunas promovidas para busca/filtro rápido no painel e no CRM
  nome text,
  cpf text not null check (cpf ~ '^[0-9]{11}$'),
  celular text not null,
  email text,
  renda_mensal_centavos bigint,

  -- Payload completo da ficha (todas as seções), em JSON
  dados jsonb not null,

  -- Registro de consentimento LGPD
  consentimento_autorizado boolean not null,
  consentimento_texto_versao text not null,
  consentimento_em timestamptz not null default now(),

  origem text not null default 'site-lopes-multimarcas',

  -- Campos de uso interno para o CRM futuro
  observacoes text,
  responsavel text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index propostas_status_idx on public.propostas (status);
create index propostas_criado_em_idx on public.propostas (criado_em desc);
create index propostas_cpf_idx on public.propostas (cpf);

-- Mantém atualizado_em correto em qualquer edição feita pelo CRM/painel
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger propostas_atualizado_em
  before update on public.propostas
  for each row
  execute function public.set_atualizado_em();

-- =============================================================================
-- Segurança (RLS): o site público só INSERE — nunca lê, altera ou apaga.
-- O consentimento é exigido pelo próprio banco, não só pela interface.
-- =============================================================================

alter table public.propostas enable row level security;

create policy "anon_insert_only" on public.propostas
  for insert to anon
  with check (consentimento_autorizado = true);

-- Defesa em profundidade: remove privilégios além do INSERT da chave pública
revoke select, update, delete on public.propostas from anon;
