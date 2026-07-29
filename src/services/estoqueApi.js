const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false';

// Só as colunas da vitrine: preço de custo, gastos e observações internas
// nem sequer são expostos pela política do banco (schema-crm-v3.sql).
const COLUNAS = 'id,nome,preco_centavos,cor,carroceria,ano_modelo,ano_fabricacao';

// Estoque de exemplo para conhecer a tela sem o Supabase configurado.
const VITRINE_DEMO = [
  { id: 'demo-1', nome: 'FIAT / ARGO DRIVE 1.0 6V FLEX', preco_centavos: 7390000, cor: 'Branco', carroceria: 'Hatch', ano_modelo: '2025', ano_fabricacao: '2024' },
  { id: 'demo-2', nome: 'HONDA / CITY SEDAN EXL 1.5 FLEX 16V 4P AUT.', preco_centavos: 8690000, cor: 'Prata', carroceria: 'Sedan', ano_modelo: '2018/2019', ano_fabricacao: '2018' },
  { id: 'demo-3', nome: 'HONDA / HR-V EX 1.8 FLEXONE 16V 5P AUT.', preco_centavos: 10790000, cor: 'Branco', carroceria: 'SUV', ano_modelo: '2020', ano_fabricacao: '2019' },
  { id: 'demo-4', nome: 'HYUNDAI / HB20 SENSE 1.0 FLEX 12V MEC.', preco_centavos: 6590000, cor: 'Branco', carroceria: 'Hatch', ano_modelo: '2023', ano_fabricacao: '2022' },
];

/**
 * Carros disponíveis para o cliente escolher na simulação.
 * Falha em silêncio: sem vitrine o formulário continua funcionando normalmente.
 */
export async function listarVitrine() {
  // Sem vitrine liberada no banco o formulário segue normalmente, sem o seletor.
  // Em VITE_DEMO_MODE=true cai numa vitrine de exemplo, para conhecer a tela.
  const semVitrine = () => (demoMode ? VITRINE_DEMO : []);

  if (!supabaseUrl || !supabaseAnonKey) return semVitrine();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/veiculos?status=eq.disponivel&select=${COLUNAS}&order=nome.asc`,
      { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } },
    );
    if (!response.ok) return semVitrine();
    const dados = await response.json();
    return Array.isArray(dados) && dados.length ? dados : semVitrine();
  } catch {
    return semVitrine();
  }
}

/** Ano no formato "fabricação/modelo", sem repetir quando já vem junto. */
export const anoDoVeiculo = (veiculo) => {
  const modelo = veiculo?.ano_modelo || '';
  const fabricacao = veiculo?.ano_fabricacao || '';
  if (modelo.includes('/')) return modelo;
  if (fabricacao && modelo && fabricacao !== modelo) return `${fabricacao}/${modelo}`;
  return modelo || fabricacao || '—';
};
