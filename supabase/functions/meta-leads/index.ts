// =============================================================================
// Lopes Multimarcas — receptor de leads do formulário instantâneo do Meta Ads
//
// O Meta chama esta função (webhook "leadgen" da página) a cada lead novo.
// Ela busca as respostas na Graph API e grava a ficha em `propostas` com
// status "novo" e origem "meta-ads". O CRM recebe o aviso em tempo real.
//
// Segredos (Supabase > Edge Functions > Secrets):
//   META_VERIFY_TOKEN  texto livre que você também cola no painel do Meta
//   META_APP_SECRET    "Chave secreta do app" (Configurações > Básico)
//   META_PAGE_TOKEN    token de acesso da página, de longa duração
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem em toda Edge Function.
//
// Publicar: supabase functions deploy meta-leads --no-verify-jwt
// (o Meta não envia o JWT do Supabase; a autenticação é a assinatura HMAC).
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const GRAPH = 'https://graph.facebook.com/v25.0';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const texto = new TextEncoder();

async function assinaturaValida(corpo: string, cabecalho: string | null) {
  const segredo = Deno.env.get('META_APP_SECRET');
  if (!segredo || !cabecalho?.startsWith('sha256=')) return false;
  const chave = await crypto.subtle.importKey('raw', texto.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const assinatura = new Uint8Array(await crypto.subtle.sign('HMAC', chave, texto.encode(corpo)));
  const esperado = Array.from(assinatura, (b) => b.toString(16).padStart(2, '0')).join('');
  const recebido = cabecalho.slice(7);
  if (recebido.length !== esperado.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i++) diferenca |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  return diferenca === 0;
}

const protocolo = () => {
  const agora = new Date();
  const ymd = agora.toISOString().slice(0, 10).replaceAll('-', '');
  return `LM-${ymd}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
};

const digitos = (v: string) => (v || '').replace(/\D/g, '');

/** "+55 11 98765-4321" → "11987654321" (o CRM guarda sem DDI). */
const celularBR = (v: string) => {
  const d = digitos(v);
  return d.length >= 12 && d.startsWith('55') ? d.slice(2) : d;
};

const normalizar = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

type Campo = { name: string; values: string[] };

/** Separa os campos padrão do Meta e guarda o resto como respostas livres. */
function mapear(campos: Campo[]) {
  const valor = (c: Campo) => (c.values || []).join(', ').trim();
  const achar = (teste: (nome: string) => boolean) => campos.find((c) => teste(normalizar(c.name)));

  const nomeCompleto =
    valor(achar((n) => n === 'full_name' || n === 'nome_completo') || ({} as Campo)) ||
    [achar((n) => n === 'first_name'), achar((n) => n === 'last_name')]
      .filter(Boolean)
      .map((c) => valor(c!))
      .join(' ');
  const telefone = achar((n) => n.includes('phone') || n.includes('telefone') || n.includes('whatsapp') || n.includes('celular'));
  const email = achar((n) => n === 'email' || n.includes('e-mail'));
  const cidade = achar((n) => n === 'city' || n === 'cidade');
  const cpf = achar((n) => n.includes('cpf'));

  const usados = new Set([telefone, email, cidade, cpf].filter(Boolean).map((c) => c!.name));
  ['full_name', 'first_name', 'last_name', 'nome_completo'].forEach((n) => usados.add(n));

  const respostas = campos
    .filter((c) => !usados.has(c.name))
    .map((c) => ({ campo: c.name, rotulo: c.name.replaceAll('_', ' '), valor: valor(c) }));

  const cpfDigitos = cpf ? digitos(valor(cpf)) : '';
  return {
    nome: nomeCompleto || null,
    celular: telefone ? celularBR(valor(telefone)) : '',
    email: email ? valor(email) : null,
    cidade: cidade ? valor(cidade) : null,
    cpf: cpfDigitos.length === 11 ? cpfDigitos : null,
    respostas,
  };
}

async function processarLead(leadId: string) {
  const token = Deno.env.get('META_PAGE_TOKEN');
  const campos = 'created_time,field_data,ad_id,ad_name,adset_name,campaign_name,form_id,platform';
  const resposta = await fetch(`${GRAPH}/${leadId}?fields=${campos}&access_token=${token}`);
  const lead = await resposta.json();
  if (!resposta.ok) throw new Error(`Graph API: ${JSON.stringify(lead.error || lead)}`);

  const dados = mapear(lead.field_data || []);
  const plataforma = lead.platform === 'ig' ? 'Instagram' : 'Facebook';

  const { error } = await supabase.from('propostas').upsert(
    {
      protocolo: protocolo(),
      status: 'novo',
      nome: dados.nome,
      cpf: dados.cpf,
      celular: dados.celular,
      email: dados.email,
      origem: 'meta-ads',
      meta_lead_id: leadId,
      indicacao: `Meta Ads (${plataforma})`,
      regiao: dados.cidade,
      // O formulário do Meta registra o aceite da política de privacidade da
      // loja, não a autorização de análise de crédito. Por isso fica "false":
      // a autorização é colhida depois, na ficha completa.
      consentimento_autorizado: false,
      consentimento_texto_versao: 'meta-lead-ads',
      dados: {
        schemaVersion: '1.0',
        origem: 'meta-ads',
        cliente: { nome: dados.nome },
        residencia: { cidade: dados.cidade },
        meta: {
          lead_id: leadId,
          form_id: lead.form_id,
          ad_id: lead.ad_id,
          anuncio: lead.ad_name,
          conjunto: lead.adset_name,
          campanha: lead.campaign_name,
          plataforma,
          recebido_em: lead.created_time,
          respostas: dados.respostas,
        },
      },
    },
    { onConflict: 'meta_lead_id', ignoreDuplicates: true },
  );
  if (error) throw new Error(`Supabase: ${error.message}`);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Verificação do webhook no painel do Meta.
  if (req.method === 'GET') {
    const ok =
      url.searchParams.get('hub.mode') === 'subscribe' &&
      url.searchParams.get('hub.verify_token') === Deno.env.get('META_VERIFY_TOKEN');
    return ok
      ? new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 })
      : new Response('Token de verificação inválido', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Método não aceito', { status: 405 });

  const corpo = await req.text();
  if (!(await assinaturaValida(corpo, req.headers.get('x-hub-signature-256')))) {
    return new Response('Assinatura inválida', { status: 401 });
  }

  const evento = JSON.parse(corpo);
  const leads: string[] = [];
  for (const entrada of evento.entry || []) {
    for (const mudanca of entrada.changes || []) {
      if (mudanca.field === 'leadgen' && mudanca.value?.leadgen_id) leads.push(String(mudanca.value.leadgen_id));
    }
  }

  // Responde 200 mesmo com falha em um lead: o erro fica no log da função e o
  // Meta não entra em loop de reenvio. Leads perdidos podem ser reprocessados
  // pelo Leads Center do Meta Business Suite.
  for (const id of leads) {
    try {
      await processarLead(id);
    } catch (erro) {
      console.error(`Lead ${id} não gravado:`, erro);
    }
  }
  return new Response('ok', { status: 200 });
});
