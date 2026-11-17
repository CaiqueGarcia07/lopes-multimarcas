// Dados fictícios para o modo demonstração: permitem conhecer o CRM
// antes de rodar a migração no Supabase. Nenhum dado real.

const diasAtras = (dias, hora = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, 15, 0, 0);
  return d.toISOString();
};

// Ficha técnica fictícia, distribuída entre os veículos do estoque de exemplo.
const fichaTecnicaDemo = [
  { carroceria: 'Hatch', combustivel: 'Flex', cambio: 'Manual' },
  { carroceria: 'Sedan', combustivel: 'Flex', cambio: 'Automático' },
  { carroceria: 'SUV', combustivel: 'Flex', cambio: 'Automático' },
  { carroceria: 'Hatch', combustivel: 'Flex', cambio: 'Automatizado' },
];

const gasto = (id, tipo, descricao, reais, diasAtrasDe) => ({
  id,
  tipo,
  descricao,
  valor_centavos: reais * 100,
  data: diasAtras(diasAtrasDe).slice(0, 10),
});

// Gastos de exemplo em alguns veículos, para as métricas terem o que mostrar.
const gastosDemo = {
  0: [gasto('g-1', 'Revisão', 'Revisão completa de entrega', 780, 30), gasto('g-2', 'Pneus', 'Jogo de 4 pneus', 2400, 25)],
  2: [gasto('g-3', 'Mecânica', 'Troca de embreagem', 1850, 20)],
  3: [
    gasto('g-4', 'Estética / Funilaria', 'Polimento e retoque de para-choque', 950, 18),
    gasto('g-5', 'Peças', 'Kit de correia dentada', 640, 15),
  ],
  6: [gasto('g-6', 'Elétrica', 'Bateria e alternador', 1290, 12)],
  8: [gasto('g-7', 'Mecânica', 'Suspensão dianteira', 1600, 10), gasto('g-8', 'Documentação', 'Transferência e licenciamento', 430, 8)],
  9: [gasto('g-9', 'Estética / Funilaria', 'Higienização interna', 380, 6)],
  12: [gasto('g-10', 'Revisão', 'Troca de óleo e filtros', 520, 5)],
};

export const demoVeiculos = [
  { nome: 'FIAT / ARGO DRIVE 1.0 6V FLEX', placa: 'TCM8D92', km: 57653, preco_centavos: 7390000, cor: 'Branco', ano_modelo: '2025' },
  { nome: 'FIAT / ARGO DRIVE 1.0 6V FLEX', placa: 'TCL2A96', km: 57301, preco_centavos: 7390000, cor: 'Cinza', ano_modelo: '2024/2025' },
  { nome: 'FIAT / CRONOS DRIVE 1.0 6V FLEX', placa: 'SYF8J37', km: 113873, preco_centavos: 7790000, cor: 'Prata', ano_modelo: '2024' },
  { nome: 'FORD / FIESTA 1.6 8V FLEX/CLASS 1.6 8V FLEX 5P', placa: 'EUL3G15', km: 221894, preco_centavos: 3190000, cor: 'Preto', ano_modelo: '2010/2011' },
  { nome: 'FORD / FIESTA 1.6 16V FLEX MEC. 5P', placa: 'FSD0J26', km: 204416, preco_centavos: 3890000, cor: 'Preto', ano_modelo: '2014' },
  { nome: 'GM - CHEVROLET / CELTA SPIRIT/ LT 1.0 MPFI 8V FLEXP. 5P', placa: 'FWT7804', km: null, preco_centavos: 3790000, cor: 'Branco', ano_modelo: '2015' },
  { nome: 'GM - CHEVROLET / CORSA HAT. PREMIUM 1.4 8V ECONOFLEX 5P', placa: 'EFP3689', km: 228733, preco_centavos: 3090000, cor: 'Cinza', ano_modelo: '2008/2009' },
  { nome: 'GM - CHEVROLET / PRISMA SED. LT 1.4 8V FLEXPOWER 4P', placa: 'PXW6452', km: 139264, preco_centavos: 5390000, cor: 'Branco', ano_modelo: '2016' },
  { nome: 'HONDA / CITY SEDAN EXL 1.5 FLEX 16V 4P AUT.', placa: 'EST4263', km: 75581, preco_centavos: 8690000, cor: 'Prata', ano_modelo: '2018/2019' },
  { nome: 'HONDA / HR-V EX 1.8 FLEXONE 16V 5P AUT.', placa: 'DFJ1D78', km: 83256, preco_centavos: 10790000, cor: 'Branco', ano_modelo: '2020' },
  { nome: 'HYUNDAI / HB20 SENSE 1.0 FLEX 12V MEC.', placa: 'RVZ5F40', km: 57260, preco_centavos: 6590000, cor: 'Branco', ano_modelo: '2023' },
  { nome: 'HYUNDAI / HB20 SENSE PLUS 1.0 FLEX 12V MEC.', placa: 'SYH6D72', km: 58455, preco_centavos: 6890000, cor: 'Prata', ano_modelo: '2023/2024' },
  { nome: 'HYUNDAI / HB20S VISION 1.0 FLEX 12V MEC.', placa: 'QXX3B65', km: 74519, preco_centavos: 6290000, cor: 'Preto', ano_modelo: '2020' },
  { nome: 'HYUNDAI / I30 2.0 16V 145CV 5P AUT.', placa: 'ETO9G00', km: 173524, preco_centavos: 4990000, cor: 'Preto', ano_modelo: '2010/2011' },
  { nome: 'HYUNDAI / IX35 2.0 16V 2WD FLEX MEC.', placa: 'FHB6153', km: 118814, preco_centavos: 6690000, cor: 'Preto', ano_modelo: '2012/2013' },
  { nome: 'RENAULT / SANDERO STEPWAY HI-POWER 1.6 8V 5P', placa: 'FJK5J64', km: 132859, preco_centavos: 4190000, cor: 'Branco', ano_modelo: '2013' },
].map((v, i) => ({
  id: `veh-${i + 1}`,
  status: 'disponivel',
  observacoes: null,
  criado_em: diasAtras(40),
  atualizado_em: diasAtras(40),
  ...fichaTecnicaDemo[i % fichaTecnicaDemo.length],
  ano_fabricacao: String(Number(String(v.ano_modelo).slice(0, 4)) - 1),
  gastos: gastosDemo[i] || [],
  ...v,
}));

const clientes = [
  ['Ana Paula Ribeiro', '1988-03-12', 'Centro, Barueri', 'Instagram', 'veh-11', 'novo', 0, null, null, null],
  ['Bruno César Almeida', '1995-11-02', 'Jardim Silveira, Barueri', 'Indicação de amigo', 'veh-3', 'novo', 1, null, null, null],
  ['Carla Fernandes', '1979-07-25', 'Alphaville, Barueri', 'Passou na loja', 'veh-10', 'em_analise', 2, 900000, null, null],
  ['Diego Souza Lima', '1990-01-30', 'Vila Porto, Barueri', 'OLX', 'veh-5', 'em_analise', 6, 400000, null, null],
  ['Elaine Cristina Rocha', '1984-09-17', 'Centro, Carapicuíba', 'Webmotors', 'veh-8', 'contatado', 3, 800000, null, null],
  ['Fábio Henrique Torres', '1998-05-08', 'Jardim Belval, Barueri', 'Instagram', 'veh-13', 'contatado', 7, 500000, null, null],
  ['Gisele Martins', '1992-12-21', 'Km 18, Osasco', 'Indicação de amigo', 'veh-1', 'aprovado', 4, 1500000, 'Santander', 7390000],
  ['Henrique Barbosa', '1975-06-03', 'Centro, Jandira', 'Passou na loja', 'veh-15', 'aprovado', 9, 1000000, 'BV Financeira', 6690000],
  ['Isabela Nunes Costa', '2000-02-14', 'Alphaville, Barueri', 'Instagram', 'veh-9', 'aprovado', 1, 2000000, 'Itaú', 8690000],
  ['João Pedro Cardoso', '1986-08-29', 'Jardim Silveira, Barueri', 'Indicação de amigo', 'veh-12', 'convertido', 12, 1200000, 'Bradesco', 6890000],
  ['Karina Lopes Dias', '1993-04-05', 'Centro, Itapevi', 'OLX', 'veh-16', 'convertido', 18, 600000, 'Pan', 4190000],
  ['Luciano Ferreira', '1969-10-11', 'Vila Porto, Barueri', 'Passou na loja', 'veh-4', 'convertido', 25, 500000, 'C6 Bank', 3290000],
  ['Marcos Vinícius Silva', '1997-01-19', 'Jardim Belval, Barueri', 'Webmotors', 'veh-7', 'reprovado', 8, 200000, null, null],
  ['Natália Gomes Prado', '1982-05-27', 'Bela Vista, Osasco', 'Instagram', 'veh-2', 'novo', 0, null, null, null],
];

export const demoFichas = clientes.map(([nome, nascimento, regiao, indicacao, veiculoId, status, dias, entrada, banco, venda], i) => {
  const cpfBase = String(10000000000 + i * 987654321).slice(0, 11);
  return {
    id: `demo-${i + 1}`,
    protocolo: `LM-DEMO-${String(i + 1).padStart(4, '0')}`,
    status,
    nome,
    cpf: cpfBase,
    celular: `119${String(80000000 + i * 111111).slice(0, 8)}`,
    email: `${nome.split(' ')[0].toLowerCase()}@exemplo.com`,
    renda_mensal_centavos: 250000 + i * 45000,
    dados: {
      cliente: { nome, dataNascimento: nascimento, estadoCivil: i % 2 ? 'Casado(a)' : 'Solteiro(a)', possuiCnh: true },
      residencia: { bairro: regiao.split(',')[0], logradouro: 'Rua Exemplo', numero: String(100 + i), celular: '11980000000' },
      trabalho: { empresa: 'Empresa Exemplo Ltda', cargo: 'Analista', rendaMensalCentavos: 250000 + i * 45000 },
      referencias: [],
    },
    veiculo_id: veiculoId,
    valor_venda_centavos: venda,
    valor_entrada_centavos: entrada,
    instituicao_financeira: banco,
    indicacao,
    regiao,
    consentimento_autorizado: true,
    consentimento_texto_versao: '2.0',
    origem: 'site-lopes-multimarcas',
    observacoes: null,
    responsavel: i % 3 === 0 ? 'Caique' : i % 3 === 1 ? 'Everaldo' : null,
    criado_em: diasAtras(dias + 1),
    atualizado_em: diasAtras(dias, 14),
  };
});

export const demoFollowups = [
  { id: 'fu-1', proposta_id: 'demo-3', autor: 'demo@lopes', nota: 'Cliente pediu simulação com entrada maior.', status_anterior: 'novo', status_novo: 'em_analise', criado_em: diasAtras(2, 11) },
  { id: 'fu-2', proposta_id: 'demo-7', autor: 'demo@lopes', nota: 'Ficha aprovada pelo Santander. Combinar retirada.', status_anterior: 'em_analise', status_novo: 'aprovado', criado_em: diasAtras(3, 16) },
  { id: 'fu-3', proposta_id: 'demo-10', autor: 'demo@lopes', nota: 'Venda concluída, documentação entregue.', status_anterior: 'aprovado', status_novo: 'convertido', criado_em: diasAtras(11, 17) },
];

// Mercado de usados (Fenauto). Mesmo conteúdo da carga inicial em
// supabase/schema-crm-v6.sql, para o modo demonstração.
export const demoMercado = [
  {
    mes: '2026-10-01',
    total_autos_comerciais: 1185372,
    total_geral: 1606314,
    variacao_mes_pct: -3.6,
    variacao_ano_pct: -9.4,
    ranking: [
      { posicao: 1, modelo: 'Volkswagen Gol', unidades: 62635 },
      { posicao: 2, modelo: 'Chevrolet Onix', unidades: 39719 },
      { posicao: 3, modelo: 'Fiat Strada', unidades: 39023 },
      { posicao: 4, modelo: 'Hyundai HB20', unidades: 38432 },
      { posicao: 5, modelo: 'Fiat Palio', unidades: 32582 },
      { posicao: 6, modelo: 'Fiat Uno', unidades: 31514 },
      { posicao: 7, modelo: 'Toyota Corolla', unidades: 25963 },
      { posicao: 8, modelo: 'Ford Ka', unidades: 24023 },
      { posicao: 9, modelo: 'Volkswagen Saveiro', unidades: 23252 },
      { posicao: 10, modelo: 'Ford Fiesta', unidades: 22871 },
    ],
    fonte: 'Fenauto',
    fonte_url:
      'https://www.bnewssaopaulo.com.br/noticias/negocios/volkswagen-gol-dispara-veja-os-10-carros-usados-mais-vendidos-do-brasil-em-outubro.html',
  },
];
