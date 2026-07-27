import { useMemo, useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';

import { STATUS_META, STATUS_OPTIONS, esperaInfo, fmtBRL, nomeDa, regiaoDa } from '../lib/format.js';

const COLUNAS = Object.entries(STATUS_META)
  .filter(([, meta]) => meta.esteira)
  .map(([status, meta]) => ({ status, meta }));

export default function Esteira({ fichas, api, onAtualizar, onRecarregar, onAbrirFicha }) {
  const [selecionadas, setSelecionadas] = useState([]);
  const [statusMassa, setStatusMassa] = useState('em_analise');
  const [movendo, setMovendo] = useState(false);
  const [arrastandoSobre, setArrastandoSobre] = useState(null);

  const porColuna = useMemo(() => {
    const mapa = Object.fromEntries(COLUNAS.map(({ status }) => [status, []]));
    fichas.forEach((f) => {
      if (mapa[f.status]) mapa[f.status].push(f);
    });
    Object.values(mapa).forEach((lista) =>
      lista.sort((a, b) => esperaInfo(b).dias - esperaInfo(a).dias),
    );
    return mapa;
  }, [fichas]);

  const alternar = (id) =>
    setSelecionadas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );

  const soltar = async (event, status) => {
    event.preventDefault();
    setArrastandoSobre(null);
    const id = event.dataTransfer.getData('text/ficha-id');
    if (!id) return;
    const ficha = fichas.find((f) => f.id === id);
    if (!ficha || ficha.status === status) return;
    await onAtualizar(id, { status });
    api.addFollowup({
      proposta_id: id,
      nota: null,
      status_anterior: ficha.status,
      status_novo: status,
    }).catch(() => {});
  };

  const moverEmMassa = async () => {
    if (!selecionadas.length) return;
    setMovendo(true);
    try {
      await api.bulkStatus(selecionadas, statusMassa);
      setSelecionadas([]);
      await onRecarregar();
    } finally {
      setMovendo(false);
    }
  };

  return (
    <div className="page page-esteira">
      <div className="page-heading">
        <h1>Esteira de fichas</h1>
        <p>Arraste os cartões entre as colunas ou selecione várias fichas para mover em massa.</p>
      </div>

      {selecionadas.length > 0 && (
        <div className="massa-bar">
          <strong>{selecionadas.length} selecionada{selecionadas.length > 1 ? 's' : ''}</strong>
          <select value={statusMassa} onChange={(e) => setStatusMassa(e.target.value)} aria-label="Nova situação">
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button type="button" className="button-primary" onClick={moverEmMassa} disabled={movendo}>
            {movendo ? 'Movendo...' : 'Mover fichas'}
          </button>
          <button type="button" className="link-button" onClick={() => setSelecionadas([])}>
            Cancelar
          </button>
        </div>
      )}

      <div className="kanban">
        {COLUNAS.map(({ status, meta }) => (
          <div
            key={status}
            className={`kanban-col ${arrastandoSobre === status ? 'drop-alvo' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastandoSobre(status);
            }}
            onDragLeave={() => setArrastandoSobre(null)}
            onDrop={(e) => soltar(e, status)}
          >
            <div className={`kanban-head cor-${meta.cor}`}>
              <span>{meta.label}</span>
              <b>{porColuna[status].length}</b>
            </div>
            <div className="kanban-cards">
              {porColuna[status].map((ficha) => {
                const espera = esperaInfo(ficha);
                const marcada = selecionadas.includes(ficha.id);
                return (
                  <div
                    key={ficha.id}
                    className={`kanban-card ${marcada ? 'marcada' : ''}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/ficha-id', ficha.id)}
                    onClick={() => onAbrirFicha(ficha.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onAbrirFicha(ficha.id)}
                  >
                    <button
                      type="button"
                      className="card-check"
                      aria-label={marcada ? 'Desmarcar ficha' : 'Selecionar ficha'}
                      onClick={(e) => {
                        e.stopPropagation();
                        alternar(ficha.id);
                      }}
                    >
                      {marcada ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <strong>{nomeDa(ficha)}</strong>
                    <small>{ficha.veiculo ? ficha.veiculo.nome : 'Sem carro vinculado'}</small>
                    <div className="card-meta">
                      <span className={`espera ${espera.nivel}`}>{espera.label}</span>
                      {ficha.valor_venda_centavos ? <span>{fmtBRL(ficha.valor_venda_centavos)}</span> : null}
                      <span className="card-regiao">{regiaoDa(ficha) || '—'}</span>
                    </div>
                  </div>
                );
              })}
              {porColuna[status].length === 0 && <div className="kanban-vazio">Vazio</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
