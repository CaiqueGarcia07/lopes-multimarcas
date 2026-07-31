import { mesclarConfig } from '../config/formulario.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Configuração do formulário definida pelo admin no CRM.
 * Se o banco não responder, cai no padrão do catálogo — o formulário nunca
 * deixa de abrir por causa disso.
 */
export async function carregarConfigFormulario() {
  if (!supabaseUrl || !supabaseAnonKey) return mesclarConfig(null);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/form_config?id=eq.1&select=dados`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
    });
    if (!response.ok) return mesclarConfig(null);
    const linhas = await response.json();
    return mesclarConfig(linhas?.[0]?.dados || null);
  } catch {
    return mesclarConfig(null);
  }
}
