import { AlertTriangle, ArrowRight, BadgeCheck, CircleDollarSign, FileText, Handshake, TrendingUp, Wallet } from 'lucide-react';

import { STATUS_META, esperaInfo, fmtBRL, fmtDate, nomeDa } from '../lib/format.js';

function Kpi({ icon: Icon, label, valor, detalhe, tom }) {
  return (
    <div className={`kpi-card ${tom || ''}`}>
      <span className="kpi-icon"><Icon size={20} /></span>
      <div>
        <span className="kpi-label">{label}</span>
        <strong className="kpi-valor">{valor}</strong>
        {detalhe && <span className="kpi-detalhe">{detalhe}</span>}
      </div>
    </div>
  );
}

export default function Dashboard({ fichas, carregando, onAbrirFicha, onIrPara }) {
  const total = fichas.length;
  const novas = fichas.filter((f) => f.status === 'novo').length;
  const aprovadas = fichas.filter((f) => f.status === 'aprovado');
  const vendas = fichas.filter((f) => f.status === 'convertido');

  const valorVendido = vendas.reduce((soma, f) => soma + (f.valor_venda_centavos || 0), 0);
  const valorAprovado = aprovadas.reduce((soma, f) => soma + (f.valor_venda_centavos || 0), 0);
  const ticketMedio = vendas.length ? valorVendido / vendas.length : null;
  const conversao = total ? Math.round((vendas.length / total) * 100) : 0;

  const atrasadas = fichas
    .filter((f) => esperaInfo(f).nivel === 'atrasado')
    .sort((a, b) => esperaInfo(b).dias - esperaInfo(a).dias)
    .slice(0, 6);

  const porStatus = Object.entries(STATUS_META).map(([status, meta]) => ({
    status,
    meta,
    qtd: fichas.filter((f) => f.status === status).length,
  }));
  const maxQtd = Math.max(1, ...porStatus.map((s) => s.qtd));

  return (
    <div className="page">
      <div className="page-heading">
        <h1>Visão geral</h1>
        <p>{carregando ? 'Carregando dados...' : 'Resumo das fichas e vendas da loja.'}</p>
      </div>

      <div className="kpi-grid">
        <Kpi icon={FileText} label="Fichas recebidas" valor={total} detalhe={`${novas} nova${novas === 1 ? '' : 's'} aguardando`} />
        <Kpi icon={BadgeCheck} label="Fichas aprovadas" valor={aprovadas.length} detalhe={valorAprovado ? `${fmtBRL(valorAprovado)} em negociação` : 'Sem valores lançados'} tom="teal" />
        <Kpi icon={Handshake} label="Vendas concluídas" valor={vendas.length} detalhe={`Conversão de ${conversao}%`} tom="green" />
        <Kpi icon={CircleDollarSign} label="Total vendido" valor={fmtBRL(valorVendido)} detalhe="Somatório das fichas concluídas" tom="green" />
        <Kpi icon={Wallet} label="Ticket médio" valor={fmtBRL(ticketMedio)} detalhe="Por venda concluída" />
        <Kpi icon={TrendingUp} label="Em andamento" valor={total - vendas.length - fichas.filter((f) => ['reprovado', 'arquivado'].includes(f.status)).length} detalhe="Fichas ativas no funil" />
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Funil por situação</h2>
            <button type="button" className="link-button" onClick={() => onIrPara('esteira')}>
              Abrir esteira <ArrowRight size={14} />
            </button>
          </div>
          <div className="funil">
            {porStatus.map(({ status, meta, qtd }) => (
              <div className="funil-linha" key={status}>
                <span className="funil-label">{meta.label}</span>
                <div className="funil-barra">
                  <span className={`cor-${meta.cor}`} style={{ width: `${(qtd / maxQtd) * 100}%` }} />
                </div>
                <span className="funil-qtd">{qtd}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2><AlertTriangle size={17} /> Aguardando ação</h2>
            <span className="panel-sub">Paradas há 5 dias ou mais</span>
          </div>
          {atrasadas.length === 0 ? (
            <p className="panel-vazio">Nenhuma ficha atrasada. Bom trabalho!</p>
          ) : (
            <ul className="lista-alertas">
              {atrasadas.map((ficha) => {
                const espera = esperaInfo(ficha);
                return (
                  <li key={ficha.id}>
                    <button type="button" onClick={() => onAbrirFicha(ficha.id)}>
                      <span className="alerta-nome">{nomeDa(ficha)}</span>
                      <span className={`status-pill cor-${STATUS_META[ficha.status].cor}`}>
                        {STATUS_META[ficha.status].label}
                      </span>
                      <span className="espera atrasado">{espera.label} parada</span>
                      <span className="alerta-data">desde {fmtDate(ficha.atualizado_em)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
