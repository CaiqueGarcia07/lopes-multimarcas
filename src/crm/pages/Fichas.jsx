import { useMemo, useState } from 'react';
import { FilterX } from 'lucide-react';

import {
  STATUS_META,
  STATUS_OPTIONS,
  buscaEm,
  esperaInfo,
  fmtBRL,
  fmtCPF,
  fmtDate,
  fmtPhone,
  idadeDe,
  nomeDa,
  regiaoDa,
} from '../lib/format.js';

const FAIXAS_IDADE = [
  { id: 'ate25', label: 'Até 25 anos', test: (i) => i != null && i <= 25 },
  { id: '26a35', label: '26 a 35 anos', test: (i) => i >= 26 && i <= 35 },
  { id: '36a50', label: '36 a 50 anos', test: (i) => i >= 36 && i <= 50 },
  { id: '50mais', label: 'Acima de 50', test: (i) => i > 50 },
];

const FAIXAS_ENTRADA = [
  { id: 'sem', label: 'Sem entrada', test: (v) => !v },
  { id: 'ate5k', label: 'Até R$ 5 mil', test: (v) => v > 0 && v <= 500000 },
  { id: '5a15k', label: 'R$ 5 a 15 mil', test: (v) => v > 500000 && v <= 1500000 },
  { id: '15kmais', label: 'Acima de R$ 15 mil', test: (v) => v > 1500000 },
];

const filtroInicial = { status: '', regiao: '', idade: '', veiculo: '', entrada: '', instituicao: '', indicacao: '' };

export default function Fichas({ fichas, veiculos, busca, carregando, onAbrirFicha }) {
  const [filtros, setFiltros] = useState(filtroInicial);

  const opcoes = useMemo(() => {
    const unicos = (lista) => [...new Set(lista.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return {
      regioes: unicos(fichas.map(regiaoDa)),
      instituicoes: unicos(fichas.map((f) => f.instituicao_financeira)),
      indicacoes: unicos(fichas.map((f) => f.indicacao)),
    };
  }, [fichas]);

  const filtradas = useMemo(() => {
    return fichas.filter((ficha) => {
      if (!buscaEm(ficha, busca)) return false;
      if (filtros.status && ficha.status !== filtros.status) return false;
      if (filtros.regiao && regiaoDa(ficha) !== filtros.regiao) return false;
      if (filtros.veiculo && ficha.veiculo_id !== filtros.veiculo) return false;
      if (filtros.instituicao && ficha.instituicao_financeira !== filtros.instituicao) return false;
      if (filtros.indicacao && ficha.indicacao !== filtros.indicacao) return false;
      if (filtros.idade) {
        const faixa = FAIXAS_IDADE.find((f) => f.id === filtros.idade);
        if (!faixa?.test(idadeDe(ficha.dados?.cliente?.dataNascimento))) return false;
      }
      if (filtros.entrada) {
        const faixa = FAIXAS_ENTRADA.find((f) => f.id === filtros.entrada);
        if (!faixa?.test(ficha.valor_entrada_centavos)) return false;
      }
      return true;
    });
  }, [fichas, busca, filtros]);

  const set = (campo) => (event) => setFiltros((atual) => ({ ...atual, [campo]: event.target.value }));
  const temFiltro = busca || Object.values(filtros).some(Boolean);

  return (
    <div className="page">
      <div className="page-heading">
        <h1>Fichas cadastrais</h1>
        <p>
          {carregando
            ? 'Carregando...'
            : `${filtradas.length} de ${fichas.length} ficha${fichas.length === 1 ? '' : 's'}${busca ? ` para "${busca}"` : ''}`}
        </p>
      </div>

      <div className="filtros-bar">
        <select value={filtros.status} onChange={set('status')} aria-label="Filtrar por situação">
          <option value="">Situação: todas</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={filtros.regiao} onChange={set('regiao')} aria-label="Filtrar por região">
          <option value="">Região: todas</option>
          {opcoes.regioes.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select value={filtros.idade} onChange={set('idade')} aria-label="Filtrar por idade">
          <option value="">Idade: todas</option>
          {FAIXAS_IDADE.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <select value={filtros.veiculo} onChange={set('veiculo')} aria-label="Filtrar por carro">
          <option value="">Carro: todos</option>
          {veiculos.map((v) => (
            <option key={v.id} value={v.id}>{v.nome} ({v.placa})</option>
          ))}
        </select>
        <select value={filtros.entrada} onChange={set('entrada')} aria-label="Filtrar por valor de entrada">
          <option value="">Entrada: todas</option>
          {FAIXAS_ENTRADA.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <select value={filtros.instituicao} onChange={set('instituicao')} aria-label="Filtrar por instituição financeira">
          <option value="">Instituição: todas</option>
          {opcoes.instituicoes.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <select value={filtros.indicacao} onChange={set('indicacao')} aria-label="Filtrar por indicação">
          <option value="">Indicação: todas</option>
          {opcoes.indicacoes.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        {temFiltro && (
          <button type="button" className="link-button" onClick={() => setFiltros(filtroInicial)}>
            <FilterX size={15} /> Limpar filtros
          </button>
        )}
      </div>

      <div className="tabela-wrap">
        <table className="tabela-fichas">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Protocolo</th>
              <th>Contato</th>
              <th>Carro</th>
              <th>Entrada</th>
              <th>Situação</th>
              <th>Espera</th>
              <th>Recebida</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((ficha) => {
              const espera = esperaInfo(ficha);
              const idade = idadeDe(ficha.dados?.cliente?.dataNascimento);
              return (
                <tr key={ficha.id} onClick={() => onAbrirFicha(ficha.id)}>
                  <td>
                    <strong>{nomeDa(ficha)}</strong>
                    <small>{[idade && `${idade} anos`, regiaoDa(ficha)].filter(Boolean).join(' · ') || '—'}</small>
                  </td>
                  <td className="mono">{ficha.protocolo}</td>
                  <td>
                    <span>{fmtPhone(ficha.celular)}</span>
                    <small className="mono">{fmtCPF(ficha.cpf)}</small>
                  </td>
                  <td>
                    {ficha.veiculo ? (
                      <>
                        <span>{ficha.veiculo.nome}</span>
                        <small>{ficha.veiculo.placa} · {fmtBRL(ficha.veiculo.preco_centavos)}</small>
                      </>
                    ) : (
                      <span className="sem-dado">Sem carro</span>
                    )}
                  </td>
                  <td>{fmtBRL(ficha.valor_entrada_centavos)}</td>
                  <td>
                    <span className={`status-pill cor-${STATUS_META[ficha.status]?.cor || 'gray'}`}>
                      {STATUS_META[ficha.status]?.label || ficha.status}
                    </span>
                  </td>
                  <td><span className={`espera ${espera.nivel}`}>{espera.label}</span></td>
                  <td>{fmtDate(ficha.criado_em)}</td>
                </tr>
              );
            })}
            {!carregando && filtradas.length === 0 && (
              <tr>
                <td colSpan={8} className="tabela-vazia">Nenhuma ficha encontrada com esses critérios.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
