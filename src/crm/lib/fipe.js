// Consulta à tabela FIPE pela API pública da Parallelum (gratuita, sem chave,
// 500 consultas por dia). A tabela muda uma vez por mês, então cada carro do
// estoque guarda os códigos de marca/modelo/ano e o último valor consultado.

const BASE = 'https://parallelum.com.br/fipe/api/v1/carros';

const cacheListas = new Map();

async function pegar(caminho) {
  const resposta = await fetch(`${BASE}${caminho}`);
  if (resposta.status === 429) throw new Error('Limite diário da FIPE atingido. Tente amanhã.');
  if (!resposta.ok) throw new Error(`A consulta à FIPE falhou (${resposta.status}).`);
  return resposta.json();
}

async function lista(caminho) {
  if (!cacheListas.has(caminho)) {
    cacheListas.set(
      caminho,
      pegar(caminho).catch((erro) => {
        cacheListas.delete(caminho);
        throw erro;
      }),
    );
  }
  return cacheListas.get(caminho);
}

export const listarMarcas = () => lista('/marcas');

export const listarModelos = async (marca) => (await lista(`/marcas/${marca}/modelos`)).modelos;

export const listarAnos = (marca, modelo) => lista(`/marcas/${marca}/modelos/${modelo}/anos`);

/** "R$ 85.608,00" → 8560800 */
export const valorEmCentavos = (texto) => Number(String(texto || '').replace(/\D/g, '')) || null;

/** Valor atual de um carro já vinculado. Devolve o objeto fipe pronto para salvar. */
export async function consultarValor(vinculo) {
  const dados = await pegar(
    `/marcas/${vinculo.marca.codigo}/modelos/${vinculo.modelo.codigo}/anos/${vinculo.ano.codigo}`,
  );
  return {
    ...vinculo,
    valor_centavos: valorEmCentavos(dados.Valor),
    codigo_fipe: dados.CodigoFipe,
    referencia: (dados.MesReferencia || '').trim(),
    consultado_em: new Date().toISOString(),
  };
}

const normalizar = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const tokens = (texto) => normalizar(texto).split(/[^a-z0-9.]+/).filter((t) => t.length > 1);

/** Marca da FIPE que corresponde ao início do nome do estoque ("GM - CHEVROLET / ..."). */
export const sugerirMarca = (marcas, nomeVeiculo) => {
  const prefixo = normalizar(String(nomeVeiculo || '').split('/')[0]);
  const palavras = tokens(prefixo);
  return (
    marcas.find((m) => normalizar(m.nome) === prefixo.trim()) ||
    marcas.find((m) => palavras.some((p) => p.length > 2 && normalizar(m.nome).includes(p))) ||
    null
  );
};

/** Modelo com mais palavras em comum com o nome do estoque. */
export const sugerirModelo = (modelos, nomeVeiculo) => {
  const alvo = new Set(tokens(String(nomeVeiculo || '').split('/').slice(1).join(' ') || nomeVeiculo));
  let melhor = null;
  let pontos = 0;
  for (const modelo of modelos) {
    const t = tokens(modelo.nome);
    const comuns = t.filter((p) => alvo.has(p)).length;
    // Desempate: o nome com menos palavras sobrando é o mais exato.
    const nota = comuns * 10 - (t.length - comuns);
    if (comuns > 0 && (melhor == null || nota > pontos)) {
      melhor = modelo;
      pontos = nota;
    }
  }
  return melhor;
};

/** Ano/combustível da FIPE pelo ano do modelo ("2024/2025" → "2025 ..."). */
export const sugerirAno = (anos, anoModelo) => {
  const ano = String(anoModelo || '').split('/').pop().trim();
  return anos.find((a) => a.nome.startsWith(ano)) || null;
};

/** O valor guardado é de um mês anterior ao atual? */
export const fipeDesatualizada = (fipe) => {
  if (!fipe?.consultado_em) return true;
  const consultado = new Date(fipe.consultado_em);
  const hoje = new Date();
  return consultado.getFullYear() !== hoje.getFullYear() || consultado.getMonth() !== hoje.getMonth();
};

/** Diferença do preço de venda para a FIPE, em centavos e em %. */
export const comparacaoFipe = (veiculo) => {
  const fipe = veiculo?.fipe?.valor_centavos;
  const preco = veiculo?.preco_centavos;
  if (!fipe || preco == null) return null;
  return { diferenca: preco - fipe, percentual: Math.round(((preco - fipe) / fipe) * 1000) / 10 };
};
