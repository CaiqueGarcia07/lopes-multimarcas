import { onlyDigits } from '../utils/form.js';

const CEP_TIMEOUT_MS = 6000;
const cache = new Map();

/**
 * Consulta o CEP no ViaCEP (público, sem chave) e devolve os campos de endereço.
 * Retorna null quando o CEP não existe ou a consulta falha — nesse caso o cliente
 * simplesmente preenche o endereço à mão.
 */
export async function buscarEnderecoPorCep(cep) {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  if (cache.has(digits)) return cache.get(digits);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), CEP_TIMEOUT_MS);

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (data.erro) {
      cache.set(digits, null);
      return null;
    }

    const endereco = {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
    };
    cache.set(digits, endereco);
    return endereco;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
