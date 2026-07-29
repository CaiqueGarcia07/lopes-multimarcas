// Ficha técnica e gastos do veículo — usados no cadastro do estoque,
// nas métricas do dashboard e na vitrine do formulário público.

export const CARROCERIAS = [
  'Hatch',
  'Sedan',
  'SUV',
  'Picape',
  'Minivan',
  'Perua',
  'Coupé',
  'Conversível',
  'Utilitário',
];

export const COMBUSTIVEIS = ['Flex', 'Gasolina', 'Etanol', 'Diesel', 'GNV', 'Híbrido', 'Elétrico'];

export const CAMBIOS = ['Manual', 'Automático', 'Automatizado', 'CVT'];

export const TIPOS_GASTO = [
  'Mecânica',
  'Estética / Funilaria',
  'Peças',
  'Pneus',
  'Elétrica',
  'Revisão',
  'Documentação',
  'Lavagem / Detalhe',
  'Outros',
];

/** Lista de gastos do veículo, sempre um array. */
export const gastosDe = (veiculo) => (Array.isArray(veiculo?.gastos) ? veiculo.gastos : []);

/** Soma de tudo que já foi investido no veículo, em centavos. */
export const totalGastos = (veiculo) =>
  gastosDe(veiculo).reduce((soma, gasto) => soma + (Number(gasto.valor_centavos) || 0), 0);

/**
 * Valor de venda descontado dos gastos — é o que a loja realmente embolsa.
 * Devolve null quando o veículo ainda não tem preço definido.
 */
export const valorLiquido = (veiculo) =>
  veiculo?.preco_centavos == null ? null : veiculo.preco_centavos - totalGastos(veiculo);

/** Percentual do preço de venda consumido por gastos. */
export const percentualGastos = (veiculo) => {
  const preco = veiculo?.preco_centavos;
  if (!preco) return null;
  return Math.round((totalGastos(veiculo) / preco) * 100);
};

/**
 * Ano no formato "fabricação/modelo". Muitos cadastros já trazem os dois anos
 * no campo do modelo ("2024/2025") — nesse caso ele é usado como está.
 */
export const anoCompleto = (veiculo) => {
  const modelo = veiculo?.ano_modelo || '';
  const fabricacao = veiculo?.ano_fabricacao || '';
  if (modelo.includes('/')) return modelo;
  if (fabricacao && modelo && fabricacao !== modelo) return `${fabricacao}/${modelo}`;
  return modelo || fabricacao || '';
};

/** Resumo curto da ficha técnica: "Hatch · Flex · Manual · 2024/2025". */
export const fichaTecnica = (veiculo) =>
  [veiculo?.carroceria, veiculo?.combustivel, veiculo?.cambio, anoCompleto(veiculo)]
    .filter(Boolean)
    .join(' · ');

/** Fotos do veículo; a primeira da lista é a capa. */
export const fotosDe = (veiculo) => (Array.isArray(veiculo?.fotos) ? veiculo.fotos : []);

export const capaDe = (veiculo) => fotosDe(veiculo)[0]?.path || null;

/** Texto usado pela busca do estoque. */
export const textoBusca = (veiculo) =>
  [
    veiculo.nome,
    veiculo.placa,
    veiculo.cor,
    veiculo.carroceria,
    veiculo.combustivel,
    veiculo.cambio,
    veiculo.ano_modelo,
    veiculo.ano_fabricacao,
    veiculo.observacoes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export const novoGasto = () => ({
  id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  tipo: TIPOS_GASTO[0],
  descricao: '',
  valor_centavos: 0,
  data: new Date().toISOString().slice(0, 10),
});
