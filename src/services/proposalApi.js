const endpoint = import.meta.env.VITE_PROPOSAL_API_URL?.trim();
const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false';

export class ProposalApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ProposalApiError';
    this.status = status;
  }
}

function createDemoResponse() {
  return {
    protocolo: `LM-${Date.now().toString().slice(-10)}`,
    modoDemonstracao: true,
  };
}

export async function submitProposal(payload) {
  if (!endpoint) {
    if (demoMode) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return createDemoResponse();
    }

    throw new ProposalApiError('Endpoint de envio não configurado.');
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ProposalApiError('O servidor recusou o envio da ficha.', response.status);
    }

    const result = await response.json().catch(() => ({}));
    return {
      protocolo: result.protocolo || result.id || `LM-${Date.now().toString().slice(-10)}`,
      modoDemonstracao: false,
      ...result,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ProposalApiError('O envio excedeu o tempo limite. Tente novamente.');
    }

    if (error instanceof ProposalApiError) throw error;
    throw new ProposalApiError('Não foi possível conectar ao serviço de propostas.');
  } finally {
    window.clearTimeout(timeoutId);
  }
}
