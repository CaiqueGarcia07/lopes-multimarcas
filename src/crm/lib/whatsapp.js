// Mensagens prontas do WhatsApp: modelos com variáveis, sugestão automática
// do modelo certo para cada ficha e montagem do link wa.me.

import { esperaInfo, fmtBRL, nomeDa } from './format.js';

/**
 * Modelos padrão. O texto aceita variáveis entre chaves, trocadas pelos dados
 * da ficha na hora do envio. Os modelos editados no CRM ficam salvos no banco
 * (tabela crm_config) e substituem estes.
 */
export const MODELOS_PADRAO = [
  {
    id: 'primeiro_contato',
    titulo: 'Primeiro contato',
    texto:
      '{saudacao}, {primeiro_nome}! Aqui é da Lopes Multimarcas. Recebemos sua ficha para o {carro} e já vamos começar a simulação do financiamento. Este é um bom horário para conversarmos?',
  },
  {
    id: 'documentos',
    titulo: 'Pedir documentos',
    texto:
      '{saudacao}, {primeiro_nome}! Para seguir com a análise, preciso de: foto da CNH ou RG, comprovante de residência e comprovante de renda. Pode mandar por aqui mesmo.',
  },
  {
    id: 'em_analise',
    titulo: 'Ficha em análise',
    texto:
      '{saudacao}, {primeiro_nome}! Sua ficha já está em análise no banco. Assim que sair a resposta eu te aviso por aqui.',
  },
  {
    id: 'financiamento_aprovado',
    titulo: 'Financiamento aprovado',
    texto:
      '{saudacao}, {primeiro_nome}! Boa notícia: seu financiamento do {carro} foi aprovado pelo {banco}, com entrada de {entrada}. Quando você pode passar na loja para fecharmos?',
  },
  {
    id: 'reprovado',
    titulo: 'Alternativa após recusa',
    texto:
      '{saudacao}, {primeiro_nome}. O banco não aprovou a ficha desta vez, mas ainda temos caminhos: outra instituição, uma entrada maior ou outro carro do estoque. Posso te mostrar as opções?',
  },
  {
    id: 'resgate',
    titulo: 'Resgate de lead',
    texto:
      '{saudacao}, {primeiro_nome}! Faz alguns dias que conversamos sobre o {carro}. Ele ainda está disponível. Quer que eu refaça a simulação com outra entrada ou outro prazo?',
  },
  {
    id: 'visita',
    titulo: 'Convite para visita',
    texto:
      '{saudacao}, {primeiro_nome}! Que tal ver o {carro} de perto e fazer um test drive? Me diz o melhor dia e horário que deixo o carro separado para você.',
  },
  {
    id: 'pos_venda',
    titulo: 'Pós-venda',
    texto:
      '{saudacao}, {primeiro_nome}! Passando para saber como está sendo a experiência com o {carro}. Se precisar de qualquer coisa, estamos aqui. E se puder indicar a Lopes para um amigo, a gente agradece.',
  },
];

export const VARIAVEIS = [
  ['{saudacao}', 'Bom dia, boa tarde ou boa noite, pela hora do envio'],
  ['{primeiro_nome}', 'Primeiro nome do cliente'],
  ['{nome}', 'Nome completo'],
  ['{carro}', 'Carro vinculado ou escolhido no site'],
  ['{preco}', 'Preço do carro vinculado'],
  ['{entrada}', 'Valor de entrada da negociação'],
  ['{banco}', 'Instituição financeira'],
  ['{protocolo}', 'Protocolo da ficha'],
];

/** Junta os modelos salvos com os padrão: um padrão apagado do banco volta. */
export const mesclarModelos = (salvos) => {
  if (!Array.isArray(salvos) || salvos.length === 0) return MODELOS_PADRAO;
  const porId = new Map(salvos.map((m) => [m.id, m]));
  const padrao = MODELOS_PADRAO.map((m) => ({ ...m, ...(porId.get(m.id) || {}) }));
  const extras = salvos.filter((m) => !MODELOS_PADRAO.some((p) => p.id === m.id));
  return [...padrao, ...extras];
};

const capitalizar = (palavra) =>
  /^[A-ZÀ-Ú]{4,}$/.test(palavra) ? palavra[0] + palavra.slice(1).toLowerCase() : palavra;

/**
 * "FIAT / ARGO DRIVE 1.0 6V FLEX" → "Fiat Argo Drive".
 * O nome do estoque segue o padrão da FIPE, que não soa natural numa conversa.
 */
export const nomeCurtoCarro = (nome) => {
  if (!nome) return null;
  const partes = nome.split('/');
  const marca = partes.length > 1 ? partes[0].split(/\s+-\s+|\s+/).filter(Boolean).pop() : null;
  const modelo = (partes.length > 1 ? partes.slice(1).join(' ') : nome).trim().split(/\s+/);
  const palavras = [];
  for (const p of modelo) {
    if (/^\d/.test(p) || palavras.length === 3) break;
    // Abreviações da FIPE ("HAT.", "SED.") não entram no nome falado.
    if (!p.endsWith('.')) palavras.push(capitalizar(p));
  }
  return [marca && capitalizar(marca), ...palavras].filter(Boolean).join(' ');
};

export const saudacaoAgora = (data = new Date()) => {
  const hora = data.getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

const carroDa = (ficha) => ficha.veiculo?.nome || ficha.dados?.veiculoInteresse?.nome || null;

/** Valores das variáveis para uma ficha. Sem dado, entra um texto neutro. */
export const valoresDa = (ficha) => {
  const nome = nomeDa(ficha);
  const carro = nomeCurtoCarro(carroDa(ficha));
  const preco = ficha.veiculo?.preco_centavos ?? ficha.dados?.veiculoInteresse?.precoCentavos;
  return {
    saudacao: saudacaoAgora(),
    primeiro_nome: nome === 'Sem nome' ? '' : nome.split(/\s+/)[0],
    nome,
    carro: carro || 'carro que você escolheu',
    preco: preco != null ? fmtBRL(preco) : 'valor a combinar',
    entrada: ficha.valor_entrada_centavos != null ? fmtBRL(ficha.valor_entrada_centavos) : 'valor a combinar',
    banco: ficha.instituicao_financeira || 'banco',
    protocolo: ficha.protocolo || '',
  };
};

/** Variáveis do modelo que vão sair com texto neutro por falta de dado. */
export const variaveisSemDado = (texto, ficha) => {
  const faltando = [];
  if (texto.includes('{carro}') && !carroDa(ficha)) faltando.push('carro');
  if (texto.includes('{entrada}') && ficha.valor_entrada_centavos == null) faltando.push('entrada');
  if (texto.includes('{banco}') && !ficha.instituicao_financeira) faltando.push('banco');
  if (texto.includes('{preco}') && ficha.veiculo?.preco_centavos == null) faltando.push('preço');
  return faltando;
};

export const preencher = (texto, ficha) => {
  const valores = valoresDa(ficha);
  return texto
    .replace(/\{(\w+)\}/g, (inteiro, chave) => (chave in valores ? valores[chave] : inteiro))
    .replace(/,\s*!/g, '!')
    .replace(/\s{2,}/g, ' ');
};

const FINAIS = ['convertido', 'arquivado', 'reprovado'];

/** Escolhe o modelo que faz sentido para a situação e o tempo parado da ficha. */
export const sugerirModelo = (ficha) => {
  if (ficha.status === 'convertido') return 'pos_venda';
  if (ficha.status === 'reprovado') return 'reprovado';
  if (ficha.status === 'aprovado') return 'financiamento_aprovado';
  if (!FINAIS.includes(ficha.status) && esperaInfo(ficha).dias >= 3) return 'resgate';
  if (ficha.status === 'novo') return 'primeiro_contato';
  if (ficha.status === 'em_analise') return 'em_analise';
  return 'visita';
};

/** Celular só com dígitos e DDI 55. */
export const numeroWhatsApp = (celular) => {
  const digitos = String(celular || '').replace(/\D/g, '');
  if (digitos.length < 10) return null;
  return digitos.startsWith('55') && digitos.length >= 12 ? digitos : `55${digitos}`;
};

export const linkWhatsApp = (celular, texto) => {
  const numero = numeroWhatsApp(celular);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
};

/**
 * Fichas que pedem contato hoje: leads novos (velocidade de resposta é o que
 * mais converte), aprovados esperando fechamento e qualquer ficha em aberto
 * parada há 3 dias ou mais.
 */
export const precisaContato = (ficha) => {
  if (FINAIS.includes(ficha.status)) return false;
  const dias = esperaInfo(ficha).dias;
  return ficha.status === 'novo' || ficha.status === 'aprovado' || dias >= 3;
};

const PRIORIDADE = { novo: 0, aprovado: 1 };

export const filaDeContato = (fichas) =>
  fichas
    .filter(precisaContato)
    .sort((a, b) => {
      const pa = PRIORIDADE[a.status] ?? 2;
      const pb = PRIORIDADE[b.status] ?? 2;
      if (pa !== pb) return pa - pb;
      return esperaInfo(b).dias - esperaInfo(a).dias;
    });
