import { generateProtocol } from '../utils/form.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const endpoint = import.meta.env.VITE_PROPOSAL_API_URL?.trim();
const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false';

const REQUEST_TIMEOUT_MS = 15000;

export class ProposalApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ProposalApiError';
    this.status = status;
  }
}

function createDemoResponse(protocolo) {
  return {
    protocolo: protocolo || generateProtocol(),
    modoDemonstracao: true,
  };
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ProposalApiError('O envio excedeu o tempo limite. Tente novamente.');
    }
    throw new ProposalApiError('Não foi possível conectar ao serviço de propostas.');
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// A RLS da tabela permite apenas INSERT para a chave anônima (sem SELECT),
// portanto o protocolo é gerado no cliente e enviado como coluna.
async function submitToSupabase(payload, protocolo) {
  const row = {
    protocolo,
    nome: payload.cliente.nome,
    cpf: payload.cliente.cpf,
    celular: payload.residencia.celular,
    email: payload.cliente.email,
    renda_mensal_centavos: payload.trabalho.rendaMensalCentavos,
    dados: payload,
    consentimento_autorizado: payload.consentimento.autorizado,
    consentimento_texto_versao: payload.consentimento.textoVersao,
    origem: payload.origem,
  };

  const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/propostas`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (response.status === 409) {
    throw new ProposalApiError('Não foi possível registrar o protocolo. Tente enviar novamente.', 409);
  }
  if (!response.ok) {
    throw new ProposalApiError('O servidor recusou o envio da ficha.', response.status);
  }

  return { protocolo, modoDemonstracao: false };
}

async function submitToWebhook(payload, protocolo) {
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ ...payload, protocolo }),
  });

  if (!response.ok) {
    throw new ProposalApiError('O servidor recusou o envio da ficha.', response.status);
  }

  const result = await response.json().catch(() => ({}));
  return {
    ...result,
    protocolo: result.protocolo || result.id || protocolo,
    modoDemonstracao: false,
  };
}

export async function submitProposal(payload, protocolo = generateProtocol()) {
  if (supabaseUrl && supabaseAnonKey) {
    return submitToSupabase(payload, protocolo);
  }

  if (endpoint) {
    return submitToWebhook(payload, protocolo);
  }

  if (demoMode) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return createDemoResponse(protocolo);
  }

  throw new ProposalApiError('Endpoint de envio não configurado.');
}
