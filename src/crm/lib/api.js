import { createClient } from '@supabase/supabase-js';

import { demoFichas, demoFollowups, demoVeiculos } from './demoData.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigurado
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const FICHA_SELECT = '*, veiculo:veiculos(id, nome, placa, cor, ano_modelo, preco_centavos, status)';

export function createSupabaseApi(client, userEmail) {
  const unwrap = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };

  return {
    demo: false,

    async listFichas() {
      return unwrap(
        await client.from('propostas').select(FICHA_SELECT).order('criado_em', { ascending: false }),
      );
    },

    async updateFicha(id, patch) {
      return unwrap(
        await client.from('propostas').update(patch).eq('id', id).select(FICHA_SELECT).single(),
      );
    },

    async bulkStatus(ids, status) {
      return unwrap(
        await client.from('propostas').update({ status }).in('id', ids).select('id'),
      );
    },

    async listVeiculos() {
      return unwrap(await client.from('veiculos').select('*').order('nome'));
    },

    async saveVeiculo(veiculo) {
      const { id, ...campos } = veiculo;
      if (id) {
        return unwrap(await client.from('veiculos').update(campos).eq('id', id).select().single());
      }
      return unwrap(await client.from('veiculos').insert(campos).select().single());
    },

    async deleteVeiculo(id) {
      unwrap(await client.from('veiculos').delete().eq('id', id).select('id'));
    },

    // Fotos ficam no bucket público "veiculos", um diretório por carro.
    async uploadFotoVeiculo(veiculoId, arquivo) {
      const nomeSeguro = arquivo.name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\w.-]+/g, '_');
      const path = `${veiculoId || 'novo'}/${Date.now()}-${nomeSeguro}`;
      unwrap(await client.storage.from('veiculos').upload(path, arquivo, { contentType: arquivo.type }));
      return { path };
    },

    async deleteFotoVeiculo(path) {
      unwrap(await client.storage.from('veiculos').remove([path]));
    },

    fotoUrl(path) {
      return client.storage.from('veiculos').getPublicUrl(path).data.publicUrl;
    },

    async listFollowups(propostaId) {
      return unwrap(
        await client
          .from('followups')
          .select('*')
          .eq('proposta_id', propostaId)
          .order('criado_em', { ascending: false }),
      );
    },

    async addFollowup(followup) {
      return unwrap(
        await client
          .from('followups')
          .insert({ ...followup, autor: followup.autor || userEmail })
          .select()
          .single(),
      );
    },

    // Anexos ficam no bucket privado "anexos", um diretório por ficha.
    async listAnexos(propostaId) {
      const arquivos = unwrap(
        await client.storage.from('anexos').list(propostaId, { sortBy: { column: 'created_at', order: 'desc' } }),
      );
      return (arquivos || [])
        .filter((a) => a.name)
        .map((a) => ({
          path: `${propostaId}/${a.name}`,
          nome: a.name.replace(/^\d+-/, ''),
          tamanho: a.metadata?.size ?? null,
          tipo: /\.pdf$/i.test(a.name) ? 'pdf' : 'imagem',
        }));
    },

    async uploadAnexo(propostaId, arquivo) {
      const nomeSeguro = arquivo.name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\w.-]+/g, '_');
      unwrap(
        await client.storage
          .from('anexos')
          .upload(`${propostaId}/${Date.now()}-${nomeSeguro}`, arquivo, { contentType: arquivo.type }),
      );
    },

    async getAnexoUrl(path) {
      const data = unwrap(await client.storage.from('anexos').createSignedUrl(path, 3600));
      return data.signedUrl;
    },

    async deleteAnexo(path) {
      unwrap(await client.storage.from('anexos').remove([path]));
    },
  };
}

// Modo demonstração: mesma interface, dados em memória.
export function createDemoApi() {
  let fichas = demoFichas.map((f) => ({ ...f }));
  let veiculos = demoVeiculos.map((v) => ({ ...v }));
  let followups = demoFollowups.map((f) => ({ ...f }));
  let anexosDemo = [];
  const fotosDemo = new Map();
  let seq = 100;

  const comVeiculo = (ficha) => ({
    ...ficha,
    veiculo: veiculos.find((v) => v.id === ficha.veiculo_id) || null,
  });
  const latency = () => new Promise((resolve) => setTimeout(resolve, 120));

  return {
    demo: true,

    async listFichas() {
      await latency();
      return fichas
        .map(comVeiculo)
        .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));
    },

    async updateFicha(id, patch) {
      await latency();
      fichas = fichas.map((f) =>
        f.id === id ? { ...f, ...patch, atualizado_em: new Date().toISOString() } : f,
      );
      return comVeiculo(fichas.find((f) => f.id === id));
    },

    async bulkStatus(ids, status) {
      await latency();
      const agora = new Date().toISOString();
      fichas = fichas.map((f) =>
        ids.includes(f.id) ? { ...f, status, atualizado_em: agora } : f,
      );
      return ids.map((id) => ({ id }));
    },

    async listVeiculos() {
      await latency();
      return [...veiculos].sort((a, b) => a.nome.localeCompare(b.nome));
    },

    async saveVeiculo(veiculo) {
      await latency();
      if (veiculo.id) {
        veiculos = veiculos.map((v) =>
          v.id === veiculo.id ? { ...v, ...veiculo, atualizado_em: new Date().toISOString() } : v,
        );
        return veiculos.find((v) => v.id === veiculo.id);
      }
      const novo = {
        status: 'disponivel',
        ...veiculo,
        id: `veh-demo-${seq++}`,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      };
      veiculos = [...veiculos, novo];
      return novo;
    },

    async deleteVeiculo(id) {
      await latency();
      veiculos = veiculos.filter((v) => v.id !== id);
      fichas = fichas.map((f) => (f.veiculo_id === id ? { ...f, veiculo_id: null } : f));
    },

    // No modo demonstração a foto vive só na memória do navegador.
    async uploadFotoVeiculo(veiculoId, arquivo) {
      await latency();
      const path = `demo/${Date.now()}-${arquivo.name}`;
      fotosDemo.set(path, URL.createObjectURL(arquivo));
      return { path };
    },

    async deleteFotoVeiculo(path) {
      await latency();
      fotosDemo.delete(path);
    },

    fotoUrl(path) {
      return fotosDemo.get(path) || '';
    },

    async listFollowups(propostaId) {
      await latency();
      return followups
        .filter((f) => f.proposta_id === propostaId)
        .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));
    },

    async addFollowup(followup) {
      await latency();
      const novo = {
        autor: 'demo@lopes',
        ...followup,
        id: `fu-demo-${seq++}`,
        criado_em: new Date().toISOString(),
      };
      followups = [novo, ...followups];
      return novo;
    },

    async listAnexos(propostaId) {
      await latency();
      return anexosDemo.filter((a) => a.propostaId === propostaId);
    },

    async uploadAnexo(propostaId, arquivo) {
      await latency();
      anexosDemo = [
        {
          propostaId,
          path: `${propostaId}/${Date.now()}-${arquivo.name}`,
          nome: arquivo.name,
          tamanho: arquivo.size,
          tipo: arquivo.type === 'application/pdf' ? 'pdf' : 'imagem',
          url: URL.createObjectURL(arquivo),
        },
        ...anexosDemo,
      ];
    },

    async getAnexoUrl(path) {
      return anexosDemo.find((a) => a.path === path)?.url;
    },

    async deleteAnexo(path) {
      await latency();
      anexosDemo = anexosDemo.filter((a) => a.path !== path);
    },
  };
}
