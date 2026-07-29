export const onlyDigits = (value = '') => String(value).replace(/\D/g, '');

export const maskCPF = (value) =>
  onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

export const maskCNPJ = (value) =>
  onlyDigits(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');

export const maskCEP = (value) =>
  onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');

export const maskPhone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

export const maskCurrency = (value) => {
  const digits = onlyDigits(value);
  if (!digits) return '';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(digits) / 100);
};

export function validateCPF(cpf) {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;

  const calculateDigit = (base, factor) => {
    let total = 0;
    for (const digit of base) total += Number(digit) * factor--;
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const digit1 = calculateDigit(digits.slice(0, 9), 10);
  const digit2 = calculateDigit(digits.slice(0, 10), 11);
  return digit1 === Number(digits[9]) && digit2 === Number(digits[10]);
}

export function validateCNPJ(cnpj) {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;

  const calculateDigit = (base, weights) => {
    const total = base
      .split('')
      .reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = calculateDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculateDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return first === Number(digits[12]) && second === Number(digits[13]);
}

// Texto exibido na tela e gravado no banco: manter uma única fonte para
// que a versão registrada nunca divirja do que o cliente realmente leu.
export const CONSENT_TEXT_VERSION = '2.0';
export const CONSENT_TEXT =
  'Autorizo a Lopes Multimarcas a tratar os dados informados nesta ficha com a finalidade exclusiva de análise de crédito e simulação de financiamento junto a instituições financeiras parceiras, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Posso solicitar a atualização ou a exclusão dos meus dados a qualquer momento pelos canais de atendimento da loja.';

export const generateProtocol = () => {
  const now = new Date();
  const ymd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LM-${ymd}-${random}`;
};

const emptyToNull = (value) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

const currencyToCents = (value) => {
  const digits = onlyDigits(value);
  return digits ? Number(digits) : null;
};

export function buildProposalPayload(form, veiculo = null) {
  return {
    schemaVersion: '1.1',
    origem: 'site-lopes-multimarcas',
    enviadoEm: new Date().toISOString(),
    // Carro escolhido pelo cliente na vitrine; null quando ele ainda não decidiu.
    veiculoInteresse: veiculo
      ? {
          id: veiculo.id,
          nome: veiculo.nome,
          precoCentavos: veiculo.preco_centavos ?? null,
          cor: emptyToNull(veiculo.cor),
          carroceria: emptyToNull(veiculo.carroceria),
          anoModelo: emptyToNull(veiculo.ano_modelo),
        }
      : null,
    cliente: {
      nome: emptyToNull(form.nome),
      rg: emptyToNull(form.rg),
      cpf: onlyDigits(form.cpf),
      estadoCivil: emptyToNull(form.estadoCivil),
      dataNascimento: emptyToNull(form.dataNascimento),
      nomeMae: emptyToNull(form.nomeMae),
      nomePai: emptyToNull(form.nomePai),
      cidadeNascimento: emptyToNull(form.cidadeNascimento),
      ufNascimento: emptyToNull(form.ufNascimento),
      email: emptyToNull(form.email)?.toLowerCase() ?? null,
      possuiCnh: form.temCnh === 'Sim',
    },
    residencia: {
      logradouro: emptyToNull(form.ruaResidencial),
      numero: emptyToNull(form.numeroResidencial),
      complemento: emptyToNull(form.complementoResidencial),
      bairro: emptyToNull(form.bairroResidencial),
      cidade: emptyToNull(form.cidadeResidencial),
      uf: emptyToNull(form.ufResidencial),
      cep: onlyDigits(form.cepResidencial) || null,
      tempoResidencia: emptyToNull(form.tempoResidencia),
      telefoneFixo: onlyDigits(form.telefoneFixoResidencial) || null,
      celular: onlyDigits(form.celular),
    },
    trabalho: {
      empresa: emptyToNull(form.nomeEmpresa),
      cargo: emptyToNull(form.cargo),
      tempoEmpresa: emptyToNull(form.tempoEmpresa),
      rendaMensalCentavos: currencyToCents(form.rendaMensal),
      cnpj: onlyDigits(form.cnpjEmpresa) || null,
      logradouro: emptyToNull(form.enderecoEmpresa),
      numero: emptyToNull(form.numeroEmpresa),
      bairro: emptyToNull(form.bairroEmpresa),
      cidade: emptyToNull(form.cidadeEmpresa),
      uf: emptyToNull(form.ufEmpresa),
      cep: onlyDigits(form.cepEmpresa) || null,
      telefoneFixo: onlyDigits(form.telefoneEmpresa) || null,
    },
    dadosBancarios: {
      banco: emptyToNull(form.banco),
      agencia: emptyToNull(form.agencia),
      conta: emptyToNull(form.conta),
    },
    referencias: [
      {
        nome: emptyToNull(form.referencia1Nome),
        parentesco: emptyToNull(form.referencia1Parentesco),
        telefone: onlyDigits(form.referencia1Telefone) || null,
      },
      {
        nome: emptyToNull(form.referencia2Nome),
        parentesco: emptyToNull(form.referencia2Parentesco),
        telefone: onlyDigits(form.referencia2Telefone) || null,
      },
    ].filter((reference) => Object.values(reference).some(Boolean)),
    consentimento: {
      autorizado: Boolean(form.consentimento),
      textoVersao: CONSENT_TEXT_VERSION,
    },
  };
}
