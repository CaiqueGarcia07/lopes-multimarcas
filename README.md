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

## Automações (fase 6)

Execute [`supabase/schema-crm-v6.sql`](supabase/schema-crm-v6.sql) no SQL Editor para ativar tudo abaixo.

- **Mensagens de WhatsApp prontas.** Na ficha, a seção *Mensagem no WhatsApp* traz modelos (primeiro contato, documentos, em análise, financiamento aprovado, alternativa após recusa, resgate, visita, pós-venda). O CRM já marca o modelo certo pela situação da ficha e pelo tempo parado, preenche nome, carro, entrada e banco, e cumprimenta conforme a hora. Os textos são editáveis e ficam salvos no banco (`crm_config`).
- **Envio registrado sozinho.** Ao abrir o WhatsApp, o envio entra no follow-up e uma ficha *Nova* passa para *Contatado*.
- **Para contatar hoje.** No dashboard, a fila com leads novos, aprovados esperando fechamento e fichas paradas há 3 dias ou mais, cada uma com o botão da mensagem sugerida.
- **Aviso de ficha nova em tempo real**, do site ou do Meta Ads, com opção de notificação do navegador.
- **Venda concluída marca o carro como vendido** (gatilho no banco), tirando-o da vitrine do site.
- **Mercado.** Cada carro do estoque comparado com a tabela FIPE (API pública da Parallelum, 500 consultas/dia, sem chave). O vínculo com a FIPE é feito uma vez por carro, com marca/modelo/ano sugeridos pelo nome; quando o mês vira, os valores se atualizam ao abrir a página. Abaixo, o ranking mensal de usados da Fenauto, destacando os modelos que você tem no estoque. O ranking fica na tabela `mercado_mensal`, um registro por mês.

### Formulário instantâneo do Meta Ads

Os leads chegam pela Edge Function [`supabase/functions/meta-leads`](supabase/functions/meta-leads/index.ts), entram como ficha *Nova* com origem `meta-ads` e aparecem no CRM na hora. CPF só é preenchido se o formulário do Meta tiver uma pergunta com "CPF" no nome; o consentimento de análise de crédito fica como não autorizado, porque o formulário do Meta não colhe essa autorização.

1. **Publique a função** (no terminal, na pasta do projeto):
   ```bash
   npx supabase login
   npx supabase link --project-ref SEU-PROJETO
   npx supabase functions deploy meta-leads --no-verify-jwt
   ```
   A URL fica `https://SEU-PROJETO.supabase.co/functions/v1/meta-leads`.
2. **Crie o app** em [developers.facebook.com](https://developers.facebook.com) → *Meus apps* → *Criar app*, caso de uso de anúncios/leads, vinculado ao portfólio empresarial da Lopes. Em *Configurações do app → Básico*, copie a **Chave secreta do app** e preencha a URL da política de privacidade.
3. **Gere o token da página** no [Explorador da Graph API](https://developers.facebook.com/tools/explorer): escolha o app, marque `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `leads_retrieval` e `ads_management` e gere o token de usuário. Estenda-o na [Ferramenta de depuração de token](https://developers.facebook.com/tools/debug/accesstoken) e consulte `me/accounts` com o token estendido: o `access_token` da página que aparece ali não expira.
4. **Guarde os segredos** na função:
   ```bash
   npx supabase secrets set META_VERIFY_TOKEN=uma-frase-qualquer META_APP_SECRET=chave-do-app META_PAGE_TOKEN=token-da-pagina
   ```
5. **Assine o webhook.** No app, adicione o produto *Webhooks*, escolha o objeto *Page*, cole a URL da função e o mesmo `META_VERIFY_TOKEN`, clique em *Verificar e salvar* e assine o campo `leadgen`.
6. **Ligue o app à página** no Explorador da Graph API, com o token da página: `POST {id-da-pagina}/subscribed_apps?subscribed_fields=leadgen`.
7. **Libere o acesso aos leads** no Meta Business Suite: *Configurações → Integrações → Acesso a leads*, incluindo o app.
8. **Coloque o app em modo Ao vivo** (no topo do painel do app). Em modo de desenvolvimento o Meta só envia leads de quem tem função no app.
9. **Teste** na [ferramenta de teste de anúncios de cadastro](https://developers.facebook.com/tools/lead-ads-testing): crie um lead e ele aparece no CRM em segundos. Se não aparecer, veja *Edge Functions → meta-leads → Logs* no Supabase.

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
