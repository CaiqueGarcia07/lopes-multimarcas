# Lopes Multimarcas — Ficha Cadastral v2

Web-app React responsivo para captura de dados usados em simulações de financiamento, seguindo a identidade visual da Lopes Multimarcas (`#01AFF4`, `#1F191B` e `#FFFFFF`).

## Recursos incluídos

- Layout responsivo para desktop, tablet e celular
- Seções recolhíveis e indicador de progresso
- Máscaras de CPF, CNPJ, CEP, telefone e valores em reais
- Validação matemática de CPF e CNPJ
- Validação dos campos obrigatórios e dos dados opcionais preenchidos
- Tela de conferência antes do envio
- Retorno visual com protocolo da proposta
- Payload normalizado e separado da camada de interface
- Serviço de API configurável por variável de ambiente
- Modo de demonstração quando não existe endpoint configurado
- Campo honeypot básico contra submissões automatizadas
- Nenhuma persistência de CPF ou dados bancários no navegador
- Servidor local de demonstração sem armazenamento e sem impressão dos dados pessoais

## Estrutura principal

```text
src/
├── App.jsx                    # Interface e fluxo do formulário
├── main.jsx                   # Inicialização do React
├── styles.css                 # Identidade visual e responsividade
├── services/
│   └── proposalApi.js         # Comunicação com API/webhook
└── utils/
    └── form.js                # Máscaras, validadores e transformação do payload

examples/
└── mock-server.mjs            # Endpoint local para testes
```

## Executar a interface

```bash
npm install
npm run dev
```

## Configurar o Supabase (recomendado)

As fichas são gravadas na tabela `propostas` de um projeto Supabase (PostgreSQL gerenciado, com painel visual gratuito), já preparada para o futuro dashboard/CRM (colunas de `status`, `responsavel`, `observacoes`).

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um novo projeto (região **São Paulo — `sa-east-1`**). Guarde a senha do banco em local seguro (o formulário não a utiliza).
2. No painel do projeto, abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Copie o arquivo de exemplo e preencha:

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

5. Rode `npm run dev` e envie uma ficha de teste. Ela aparece em **Table Editor → propostas** com `status = 'novo'`.

### Segurança do banco

- A chave `anon` é pública por design; a proteção vem da RLS: ela **só consegue inserir** linhas (nunca ler, alterar ou apagar) e o próprio banco rejeita inserções sem `consentimento_autorizado = true`.
- A tabela guarda dados pessoais (CPF, renda, dados bancários): a loja é responsável, perante a LGPD, por manter política de retenção e atender pedidos de exclusão.

## CRM (equipe da loja)

O CRM roda em **`/crm/`** (ex.: `http://localhost:5173/crm/`) e inclui: dashboard com KPIs (fichas, aprovações, vendas e valores), lista de fichas com filtros (região, idade, carro, entrada, instituição, indicação) e busca global (protocolo, CPF, celular, carro, nome), esteira kanban com arrastar-e-soltar e ações em massa, estoque de veículos, follow-up com histórico e indicadores de tempo de espera, e tema claro/escuro.

Para ativar com dados reais:

1. No **SQL Editor** do Supabase, execute [`supabase/schema-crm.sql`](supabase/schema-crm.sql) (cria `veiculos` com o estoque atual, `followups` e os campos de negociação em `propostas`).
2. Em **Authentication → Users → Add user**, crie o e-mail/senha de cada pessoa da equipe (marque "Auto Confirm User").
3. Acesse `/crm/` e faça login.

Sem login é possível clicar em **"Ver demonstração"** para conhecer o CRM com dados fictícios. A segurança segue o mesmo princípio da ficha: o papel `authenticated` (equipe logada) gerencia tudo; o `anon` (site público) continua apenas inserindo fichas e não enxerga estoque nem follow-ups.

## Envio por webhook (alternativa)

Sem as variáveis do Supabase, o formulário usa `VITE_PROPOSAL_API_URL`:

```env
VITE_PROPOSAL_API_URL=https://api.exemplo.com/propostas
VITE_DEMO_MODE=false
```

Quando nenhum destino está configurado e `VITE_DEMO_MODE=true`, o formulário simula o envio e gera um protocolo local. Nenhum dado sai do navegador nesse modo.

## Testar com o servidor local

Em um terminal:

```bash
npm run mock
```

No `.env.local`:

```env
VITE_PROPOSAL_API_URL=http://localhost:8787/propostas
VITE_DEMO_MODE=false
```

Depois execute a interface com `npm run dev`.

## Formato do payload

O envio é organizado em blocos para facilitar integrações com CRMs, bancos, webhooks e plataformas de automação:

```json
{
  "schemaVersion": "1.0",
  "origem": "site-lopes-multimarcas",
  "enviadoEm": "2026-07-24T12:00:00.000Z",
  "cliente": {},
  "residencia": {},
  "trabalho": {},
  "dadosBancarios": {},
  "referencias": [],
  "consentimento": {}
}
```

CPF, CNPJ, CEP e telefones são enviados somente com números. A renda mensal é enviada no campo `rendaMensalCentavos`, evitando erros de ponto e vírgula em integrações.

## Build de produção

```bash
npm run build
```

## Recomendações para produção

Não coloque segredos em variáveis `VITE_*`, pois elas ficam disponíveis no navegador. Utilize HTTPS, autenticação entre serviços, limitação de requisições, validação também no backend, criptografia, controle de acesso, trilha de auditoria e política de retenção. O servidor em `examples/` é apenas um mock local e não deve receber dados reais de clientes.
