import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';

import { maskCurrency, onlyDigits } from '../../utils/form.js';
import { fmtBRL, fmtKm } from '../lib/format.js';

const STATUS_VEICULO = {
  disponivel: { label: 'Disponível', cor: 'green' },
  reservado: { label: 'Reservado', cor: 'amber' },
  vendido: { label: 'Vendido', cor: 'gray' },
};

const vazio = { nome: '', placa: '', km: '', preco: '', cor: '', ano_modelo: '', status: 'disponivel', observacoes: '' };

export default function Estoque({ veiculos, fichas, api, onRecarregar }) {
  const [editando, setEditando] = useState(null); // objeto do formulário ou null
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const interessados = useMemo(() => {
    const mapa = {};
    fichas.forEach((f) => {
      if (f.veiculo_id) mapa[f.veiculo_id] = (mapa[f.veiculo_id] || 0) + 1;
    });
    return mapa;
  }, [fichas]);

  const listados = filtroStatus ? veiculos.filter((v) => v.status === filtroStatus) : veiculos;

  const abrirNovo = () => setEditando({ ...vazio });
  const abrirEdicao = (veiculo) =>
    setEditando({
      id: veiculo.id,
      nome: veiculo.nome || '',
      placa: veiculo.placa || '',
      km: veiculo.km != null ? String(veiculo.km) : '',
      preco: veiculo.preco_centavos != null ? maskCurrency(String(veiculo.preco_centavos)) : '',
      cor: veiculo.cor || '',
      ano_modelo: veiculo.ano_modelo || '',
      status: veiculo.status,
      observacoes: veiculo.observacoes || '',
    });

  const salvar = async (event) => {
    event.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      await api.saveVeiculo({
        id: editando.id,
        nome: editando.nome.trim(),
        placa: editando.placa.trim().toUpperCase() || null,
        km: editando.km ? Number(onlyDigits(editando.km)) : null,
        preco_centavos: editando.preco ? Number(onlyDigits(editando.preco)) : null,
        cor: editando.cor.trim() || null,
        ano_modelo: editando.ano_modelo.trim() || null,
        status: editando.status,
        observacoes: editando.observacoes.trim() || null,
      });
      setEditando(null);
      await onRecarregar();
    } catch (error) {
      setErro(`Não foi possível salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (veiculo) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Excluir "${veiculo.nome}" (${veiculo.placa}) do estoque?`)) return;
    await api.deleteVeiculo(veiculo.id);
    await onRecarregar();
  };

  const campo = (chave) => (event) =>
    setEditando((atual) => ({
      ...atual,
      [chave]: chave === 'preco' ? maskCurrency(event.target.value) : event.target.value,
    }));

  return (
    <div className="page">
      <div className="page-heading com-acao">
        <div>
          <h1>Estoque de carros</h1>
          <p>{veiculos.length} veículo{veiculos.length === 1 ? '' : 's'} · importado do controle da loja</p>
        </div>
        <div className="heading-acoes">
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Filtrar estoque">
            <option value="">Todos</option>
            {Object.entries(STATUS_VEICULO).map(([valor, meta]) => (
              <option key={valor} value={valor}>{meta.label}</option>
            ))}
          </select>
          <button type="button" className="button-primary" onClick={abrirNovo}>
            <Plus size={17} /> Novo veículo
          </button>
        </div>
      </div>

      <div className="estoque-grid">
        {listados.map((veiculo) => {
          const meta = STATUS_VEICULO[veiculo.status] || STATUS_VEICULO.disponivel;
          const qtd = interessados[veiculo.id] || 0;
          return (
            <div className="veiculo-card" key={veiculo.id}>
              <div className="veiculo-topo">
                <span className={`status-pill cor-${meta.cor}`}>{meta.label}</span>
                <div className="veiculo-acoes">
                  <button type="button" className="icon-button" onClick={() => abrirEdicao(veiculo)} aria-label={`Editar ${veiculo.nome}`}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="icon-button perigo" onClick={() => excluir(veiculo)} aria-label={`Excluir ${veiculo.nome}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <strong className="veiculo-nome">{veiculo.nome}</strong>
              <span className="veiculo-preco">{fmtBRL(veiculo.preco_centavos)}</span>
              <div className="veiculo-detalhes">
                <span className="mono">{veiculo.placa || 'Sem placa'}</span>
                <span>{veiculo.ano_modelo || '—'}</span>
                <span>{veiculo.cor || '—'}</span>
                <span>{fmtKm(veiculo.km)}</span>
              </div>
              {qtd > 0 && (
                <span className="veiculo-interesse">
                  {qtd} ficha{qtd > 1 ? 's' : ''} vinculada{qtd > 1 ? 's' : ''}
                </span>
              )}
            </div>
          );
        })}
        {listados.length === 0 && <p className="panel-vazio">Nenhum veículo neste filtro.</p>}
      </div>

      {editando && (
        <div className="crm-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setEditando(null)}>
          <form className="crm-modal" onSubmit={salvar}>
            <div className="modal-topo">
              <h2>{editando.id ? 'Editar veículo' : 'Novo veículo'}</h2>
              <button type="button" className="icon-button" onClick={() => setEditando(null)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <label>Nome / modelo *</label>
            <input value={editando.nome} onChange={campo('nome')} placeholder="MARCA / MODELO VERSÃO" required />
            <div className="modal-grid">
              <div>
                <label>Placa</label>
                <input value={editando.placa} onChange={campo('placa')} placeholder="ABC1D23" maxLength={8} />
              </div>
              <div>
                <label>KM</label>
                <input value={editando.km} onChange={campo('km')} inputMode="numeric" placeholder="57.000" />
              </div>
              <div>
                <label>Preço de venda</label>
                <input value={editando.preco} onChange={campo('preco')} inputMode="numeric" placeholder="R$ 0,00" />
              </div>
              <div>
                <label>Cor</label>
                <input value={editando.cor} onChange={campo('cor')} placeholder="Branco" />
              </div>
              <div>
                <label>Ano do modelo</label>
                <input value={editando.ano_modelo} onChange={campo('ano_modelo')} placeholder="2024/2025" />
              </div>
              <div>
                <label>Situação</label>
                <select value={editando.status} onChange={campo('status')}>
                  {Object.entries(STATUS_VEICULO).map(([valor, meta]) => (
                    <option key={valor} value={valor}>{meta.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <label>Observações</label>
            <textarea value={editando.observacoes} onChange={campo('observacoes')} rows={2} placeholder="Detalhes internos do veículo" />
            {erro && <div className="crm-error">{erro}</div>}
            <div className="modal-acoes">
              <button type="button" className="button-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button type="submit" className="button-primary" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar veículo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
