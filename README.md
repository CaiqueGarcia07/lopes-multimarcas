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

## Configurar o envio

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Configure o endpoint:

```env
VITE_PROPOSAL_API_URL=https://api.exemplo.com/propostas
VITE_DEMO_MODE=false
```

Quando `VITE_PROPOSAL_API_URL` estiver vazio e `VITE_DEMO_MODE=true`, o formulário simula o envio e gera um protocolo local. Nenhum dado sai do navegador nesse modo.

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
