# Lopes Multimarcas — Ficha Cadastral + CRM

Web-app React responsivo para captura de fichas de financiamento e CRM interno da loja, seguindo a identidade visual da Lopes Multimarcas (`#01AFF4`, `#1F191B` e `#FFFFFF`).

**No ar (GitHub Pages, publica automático a cada push na `main`):**

- Formulário público: <https://caiquegarcia07.github.io/lopes-multimarcas/>
- CRM da equipe: <https://caiquegarcia07.github.io/lopes-multimarcas/crm/>

## Design system

Formulário e CRM compartilham a mesma base visual: **Tailwind CSS v4** + componentes no padrão **shadcn/ui** (Radix UI + CVA), copiados para `src/components/ui/` — o código dos componentes é do projeto, sem dependência de tema externo.

- Tokens de cor, raio, sombra e tipografia ficam em [`src/index.css`](src/index.css); trocar a marca ali reflete nas duas telas.
- Tema escuro do CRM usa o atributo `data-theme="dark"` no `<html>` (variante `dark:` do Tailwind mapeada para ele).
- **Tipografia:** o formulário usa Sora (títulos) + Plus Jakarta Sans (corpo) — mais próximo do cliente final. O CRM usa IBM Plex Sans + Inter e cantos menos arredondados, sob o seletor `[data-app='crm']`, para leitura corporativa.

### Adaptar para outra loja

O projeto foi mantido enxuto o bastante para ser republicado com outra identidade visual. A marca vive em poucos lugares — mudar estes cinco pontos entrega um site novo:

| O quê | Onde |
|---|---|
| Cores, raio de canto e fontes | blocos `:root` e `[data-app='crm']` em [`src/index.css`](src/index.css) |
| Logo, foto de fundo e favicons | arquivos em `public/` (mesmos nomes, para não mexer no código) |
| Link das fontes, título da aba e meta tags | [`index.html`](index.html) e [`crm/index.html`](crm/index.html) |
| Nome da loja no aceite LGPD | `CONSENT_TEXT` em [`src/utils/form.js`](src/utils/form.js) |
| Textos do topo (chamada, descrição, selos) e rodapé | seção `hero` em [`src/App.jsx`](src/App.jsx) |

Os campos do formulário em si não precisam de código: o admin de cada loja liga, desliga, renomeia e reordena tudo pela aba **Administração** do CRM.
- Fundo fotográfico do formulário e do login: `public/hero-showroom.jpg` — foto de showroom do [Unsplash](https://unsplash.com/) (licença livre, uso comercial permitido). Para usar uma foto da própria loja, basta substituir o arquivo mantendo o nome.

## Recursos incluídos

- Layout responsivo para desktop, tablet e celular
- Fundo fotográfico com sobreposição escura e cartões em vidro fosco
- Seletor do veículo de interesse, alimentado pelo estoque do CRM
- Endereço preenchido automaticamente pelo CEP (ViaCEP)
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
├── index.css                  # Tokens do design system (Tailwind v4 + shadcn/ui)
├── components/ui/             # Componentes shadcn/ui usados nas duas telas
├── lib/utils.js               # cn() — junção de classes do Tailwind
├── crm/                       # CRM interno (shell, páginas e helpers)
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

Cada veículo do estoque tem ficha técnica (carroceria, combustível, câmbio, ano de fabricação e do modelo), **fotos** e uma **lista editável de gastos** — mecânica, estética, peças, pneus, documentação. Os gastos são descontados do preço de venda e viram o *valor líquido* do carro, somado no dashboard.

O estoque tem três modos de visualização (**galeria com foto**, **quadro** e **lista**), busca só de veículos (modelo, placa, cor, câmbio, ano), filtros por situação, carroceria, combustível e câmbio, e ordenação por nome, preço, km, data, gasto ou valor líquido. O modo escolhido fica salvo no navegador.

Para ativar com dados reais:

1. No **SQL Editor** do Supabase, execute [`supabase/schema-crm.sql`](supabase/schema-crm.sql) (cria `veiculos` com o estoque atual, `followups` e os campos de negociação em `propostas`).
2. Execute também [`supabase/schema-crm-v3.sql`](supabase/schema-crm-v3.sql) — ficha técnica e gastos do veículo, mais a política que libera a **vitrine pública** (o site enxerga só carros disponíveis e só as colunas da vitrine; gastos e observações internas continuam invisíveis).
3. Execute [`supabase/schema-crm-v4.sql`](supabase/schema-crm-v4.sql) — fotos dos veículos e o bucket `veiculos` no Storage. Esse bucket é **público** por ser material de vitrine; não envie documento de cliente para ele (documentos vão no bucket privado `anexos`, pela ficha).
4. Execute [`supabase/schema-crm-v5.sql`](supabase/schema-crm-v5.sql) — perfis de acesso e configuração do formulário. **Troque o e-mail do primeiro admin no final do arquivo** antes de rodar.
5. Em **Authentication → Users → Add user**, crie o e-mail/senha de cada pessoa da equipe (marque "Auto Confirm User").
6. Acesse `/crm/` e faça login.

### Papéis de acesso

- **Equipe** — fichas, esteira, estoque e dashboard.
- **Admin** — tudo isso mais a aba **Administração**, onde dá para esconder campos do formulário público, mudar o rótulo que o cliente lê, definir o que é obrigatório, reordenar as seções e gerenciar quem é admin.

CPF, celular e a autorização LGPD são fixos e não podem ser escondidos nem virar opcionais — sem eles não há análise de crédito nem base legal para tratar os dados. A restrição é aplicada no banco pela política `admin_edita_config`, não só na interface.

Enquanto a fase 3 não roda, o formulário simplesmente não mostra o seletor de veículos — nada quebra.

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
