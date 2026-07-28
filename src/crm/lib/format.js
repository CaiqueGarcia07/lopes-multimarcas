export const fmtBRL = (centavos) => {
  if (centavos == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
};

export const fmtKm = (km) => (km == null ? '—' : `${new Intl.NumberFormat('pt-BR').format(km)} km`);

export const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
};

export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export const fmtCPF = (digits) => {
  if (!digits || digits.length !== 11) return digits || '—';
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export const fmtPhone = (digits) => {
  if (!digits) return '—';
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
};

export const idadeDe = (dataNascimento) => {
  if (!dataNascimento) return null;
  const nasc = new Date(`${dataNascimento}T00:00:00`);
  if (Number.isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mes = hoje.getMonth() - nasc.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade -= 1;
  return idade;
};

export const diasDesde = (iso) => {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
};

// Situações da ficha no funil. A ordem define as colunas da esteira.
export const STATUS_META = {
  novo: { label: 'Nova', cor: 'blue', esteira: true },
  em_analise: { label: 'Em análise', cor: 'amber', esteira: true },
  contatado: { label: 'Contatado', cor: 'purple', esteira: true },
  aprovado: { label: 'Aprovada', cor: 'teal', esteira: true },
  convertido: { label: 'Concluída (venda)', cor: 'green', esteira: true },
  reprovado: { label: 'Reprovada', cor: 'red', esteira: false },
  arquivado: { label: 'Arquivada', cor: 'gray', esteira: false },
};

export const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

// Classes Tailwind por cor de situação — literais para o scanner do Tailwind enxergar.
export const CORES = {
  blue: {
    pill: 'border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300',
    solid: 'bg-sky-500',
    dot: 'bg-sky-500',
  },
  amber: {
    pill: 'border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300',
    solid: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  purple: {
    pill: 'border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-300',
    solid: 'bg-violet-500',
    dot: 'bg-violet-500',
  },
  teal: {
    pill: 'border-teal-500/25 bg-teal-500/12 text-teal-700 dark:text-teal-300',
    solid: 'bg-teal-500',
    dot: 'bg-teal-500',
  },
  green: {
    pill: 'border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    solid: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  red: {
    pill: 'border-red-500/25 bg-red-500/12 text-red-700 dark:text-red-300',
    solid: 'bg-red-500',
    dot: 'bg-red-500',
  },
  gray: {
    pill: 'border-slate-400/25 bg-slate-400/12 text-slate-600 dark:text-slate-300',
    solid: 'bg-slate-400',
    dot: 'bg-slate-400',
  },
};

export const corDoStatus = (status) => CORES[STATUS_META[status]?.cor] || CORES.gray;

// Classes do indicador de espera.
export const ESPERA_CLASSES = {
  ok: 'border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  atencao: 'border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300',
  atrasado: 'border-red-500/25 bg-red-500/12 text-red-700 dark:text-red-300',
};

// Indicador de tempo de espera desde a última movimentação.
export const esperaInfo = (ficha) => {
  const referencia = ficha.atualizado_em || ficha.criado_em;
  const dias = diasDesde(referencia) ?? 0;
  if (ficha.status === 'convertido' || ficha.status === 'arquivado' || ficha.status === 'reprovado') {
    return { dias, nivel: 'ok', label: `${dias}d` };
  }
  if (dias <= 1) return { dias, nivel: 'ok', label: dias === 0 ? 'hoje' : '1d' };
  if (dias <= 4) return { dias, nivel: 'atencao', label: `${dias}d` };
  return { dias, nivel: 'atrasado', label: `${dias}d` };
};

export const regiaoDa = (ficha) =>
  ficha.regiao || ficha.dados?.residencia?.bairro || null;

export const nomeDa = (ficha) => ficha.nome || ficha.dados?.cliente?.nome || 'Sem nome';

export const buscaEm = (ficha, termo) => {
  const t = termo.trim().toLowerCase();
  if (!t) return true;
  const digits = t.replace(/\D/g, '');
  const campos = [
    ficha.protocolo,
    nomeDa(ficha),
    ficha.veiculo?.nome,
    ficha.veiculo?.placa,
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
  if (campos.some((c) => c.includes(t))) return true;
  if (digits.length >= 3) {
    if ((ficha.cpf || '').includes(digits)) return true;
    if ((ficha.celular || '').includes(digits)) return true;
  }
  return false;
};
