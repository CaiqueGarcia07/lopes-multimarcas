/*
  Catálogo do formulário público: a lista de seções e campos que o admin pode
  configurar no CRM. É a fonte única compartilhada pelas duas telas — o
  formulário renderiza a partir daqui e a tela de administração edita isto.

  `fixo: true` marca campo que não pode ser escondido nem virar opcional:
  são os dados sem os quais não existe análise de crédito, ou exigidos por lei.
*/

export const CATALOGO = [
  {
    id: 'veiculo',
    titulo: 'Veículo de interesse',
    descricao: 'Vitrine com o estoque disponível da loja',
    campos: [{ id: 'veiculoId', rotulo: 'Veículo de interesse' }],
  },
  {
    id: 'pessoais',
    titulo: 'Dados pessoais',
    descricao: 'Informações de identificação do cliente',
    campos: [
      { id: 'nome', rotulo: 'Nome completo', obrigatorio: true },
      { id: 'rg', rotulo: 'RG' },
      { id: 'cpf', rotulo: 'CPF', obrigatorio: true, fixo: true },
      { id: 'estadoCivil', rotulo: 'Estado civil' },
      { id: 'dataNascimento', rotulo: 'Data de nascimento', obrigatorio: true },
      { id: 'nomeMae', rotulo: 'Nome da mãe' },
      { id: 'nomePai', rotulo: 'Nome do pai' },
      { id: 'cidadeNascimento', rotulo: 'Cidade de nascimento' },
      { id: 'ufNascimento', rotulo: 'UF de nascimento' },
      { id: 'email', rotulo: 'E-mail' },
      { id: 'temCnh', rotulo: 'Possui CNH?', obrigatorio: true },
    ],
  },
  {
    id: 'residenciais',
    titulo: 'Dados residenciais',
    descricao: 'Endereço e formas de contato',
    campos: [
      { id: 'cepResidencial', rotulo: 'CEP', obrigatorio: true },
      { id: 'numeroResidencial', rotulo: 'Número', obrigatorio: true },
      { id: 'ruaResidencial', rotulo: 'Rua / Avenida', obrigatorio: true },
      { id: 'complementoResidencial', rotulo: 'Complemento' },
      { id: 'bairroResidencial', rotulo: 'Bairro', obrigatorio: true },
      { id: 'cidadeResidencial', rotulo: 'Cidade', obrigatorio: true },
      { id: 'ufResidencial', rotulo: 'UF', obrigatorio: true },
      { id: 'tempoResidencia', rotulo: 'Tempo de residência' },
      { id: 'telefoneFixoResidencial', rotulo: 'Telefone fixo' },
      { id: 'celular', rotulo: 'Telefone celular', obrigatorio: true, fixo: true },
    ],
  },
  {
    id: 'profissionais',
    titulo: 'Dados profissionais',
    descricao: 'Empresa, ocupação e renda mensal',
    campos: [
      { id: 'nomeEmpresa', rotulo: 'Nome da empresa' },
      { id: 'cargo', rotulo: 'Cargo / Função' },
      { id: 'tempoEmpresa', rotulo: 'Tempo de empresa' },
      { id: 'rendaMensal', rotulo: 'Renda mensal' },
      { id: 'cnpjEmpresa', rotulo: 'CNPJ' },
      { id: 'cepEmpresa', rotulo: 'CEP' },
      { id: 'numeroEmpresa', rotulo: 'Número' },
      { id: 'enderecoEmpresa', rotulo: 'Endereço da empresa' },
      { id: 'bairroEmpresa', rotulo: 'Bairro' },
      { id: 'cidadeEmpresa', rotulo: 'Cidade' },
      { id: 'ufEmpresa', rotulo: 'UF' },
      { id: 'telefoneEmpresa', rotulo: 'Telefone fixo' },
    ],
  },
  {
    id: 'bancarios',
    titulo: 'Dados bancários',
    descricao: 'Relacionamento bancário do cliente',
    campos: [
      { id: 'banco', rotulo: 'Banco' },
      { id: 'agencia', rotulo: 'Agência' },
      { id: 'conta', rotulo: 'Conta' },
    ],
  },
  {
    id: 'referencias',
    titulo: 'Referências pessoais',
    descricao: 'Duas pessoas que possam confirmar seus dados',
    campos: [
      { id: 'referencia1Nome', rotulo: 'Nome (referência 1)' },
      { id: 'referencia1Parentesco', rotulo: 'Parentesco (referência 1)' },
      { id: 'referencia1Telefone', rotulo: 'Telefone (referência 1)' },
      { id: 'referencia2Nome', rotulo: 'Nome (referência 2)' },
      { id: 'referencia2Parentesco', rotulo: 'Parentesco (referência 2)' },
      { id: 'referencia2Telefone', rotulo: 'Telefone (referência 2)' },
    ],
  },
];

/** Índice campo → metadados do catálogo. */
export const CAMPOS_CATALOGO = Object.fromEntries(
  CATALOGO.flatMap((secao) => secao.campos.map((campo) => [campo.id, { ...campo, secao: secao.id }])),
);

/** Configuração de fábrica: tudo visível, obrigatoriedade do catálogo. */
export function configPadrao() {
  return {
    versao: 1,
    secoes: CATALOGO.map((secao) => ({
      id: secao.id,
      visivel: true,
      titulo: secao.titulo,
      campos: secao.campos.map((campo) => ({
        id: campo.id,
        visivel: true,
        obrigatorio: Boolean(campo.obrigatorio),
        rotulo: campo.rotulo,
      })),
    })),
  };
}

/**
 * Mescla o que está salvo com o catálogo atual. Campo novo no código entra
 * visível; campo removido do código some da configuração. Campo `fixo` volta
 * a ser visível e obrigatório mesmo que o banco diga o contrário.
 */
export function mesclarConfig(salva) {
  const padrao = configPadrao();
  if (!salva?.secoes) return padrao;

  const salvasPorId = Object.fromEntries(salva.secoes.map((s) => [s.id, s]));

  const secoes = padrao.secoes.map((secaoPadrao) => {
    const salvaSecao = salvasPorId[secaoPadrao.id];
    if (!salvaSecao) return secaoPadrao;

    const camposSalvos = Object.fromEntries((salvaSecao.campos || []).map((c) => [c.id, c]));
    return {
      ...secaoPadrao,
      visivel: salvaSecao.visivel !== false,
      titulo: salvaSecao.titulo || secaoPadrao.titulo,
      campos: secaoPadrao.campos.map((campoPadrao) => {
        const salvo = camposSalvos[campoPadrao.id];
        const fixo = CAMPOS_CATALOGO[campoPadrao.id]?.fixo;
        if (!salvo || fixo) return campoPadrao;
        return {
          id: campoPadrao.id,
          visivel: salvo.visivel !== false,
          obrigatorio: Boolean(salvo.obrigatorio),
          rotulo: salvo.rotulo || campoPadrao.rotulo,
        };
      }),
    };
  });

  // Ordem das seções: respeita a salva, com as novas no fim.
  const ordemSalva = salva.secoes.map((s) => s.id);
  secoes.sort((a, b) => {
    const ia = ordemSalva.indexOf(a.id);
    const ib = ordemSalva.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return { versao: 1, secoes };
}

/** Achata a configuração num índice campo → regras, usado pelo formulário. */
export function indexarCampos(config) {
  return Object.fromEntries(
    config.secoes.flatMap((secao) =>
      secao.campos.map((campo) => [
        campo.id,
        { ...campo, secaoVisivel: secao.visivel, visivel: campo.visivel && secao.visivel },
      ]),
    ),
  );
}
