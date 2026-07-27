import { useCallback, useEffect, useState } from 'react';
import { CarFront, Clock, MessageSquarePlus, Phone, X } from 'lucide-react';

import { maskCurrency, onlyDigits } from '../../utils/form.js';
import {
  STATUS_META,
  STATUS_OPTIONS,
  esperaInfo,
  fmtBRL,
  fmtCPF,
  fmtDate,
  fmtDateTime,
  fmtPhone,
  idadeDe,
  nomeDa,
} from '../lib/format.js';

function Info({ rotulo, children }) {
  return (
    <div className="info">
      <span className="info-rotulo">{rotulo}</span>
      <span className="info-valor">{children ?? '—'}</span>
    </div>
  );
}

export default function FichaDetail({ ficha, veiculos, api, onAtualizar, onFechar }) {
  const dados = ficha.dados || {};
  const cliente = dados.cliente || {};
  const residencia = dados.residencia || {};
  const trabalho = dados.trabalho || {};
  const referencias = dados.referencias || [];
  const espera = esperaInfo(ficha);
  const idade = idadeDe(cliente.dataNascimento);

  const [negociacao, setNegociacao] = useState({});
  const [followups, setFollowups] = useState([]);
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    setNegociacao({
      veiculo_id: ficha.veiculo_id || '',
      valor_venda: ficha.valor_venda_centavos != null ? maskCurrency(String(ficha.valor_venda_centavos)) : '',
      valor_entrada: ficha.valor_entrada_centavos != null ? maskCurrency(String(ficha.valor_entrada_centavos)) : '',
      instituicao_financeira: ficha.instituicao_financeira || '',
      indicacao: ficha.indicacao || '',
      regiao: ficha.regiao || residencia.bairro || '',
      responsavel: ficha.responsavel || '',
      observacoes: ficha.observacoes || '',
    });
  }, [ficha, residencia.bairro]);

  const carregarFollowups = useCallback(() => {
    api.listFollowups(ficha.id).then(setFollowups).catch(() => setFollowups([]));
  }, [api, ficha.id]);

  useEffect(() => {
    carregarFollowups();
  }, [carregarFollowups]);

  useEffect(() => {
    const fechaComEsc = (event) => event.key === 'Escape' && onFechar();
    window.addEventListener('keydown', fechaComEsc);
    return () => window.removeEventListener('keydown', fechaComEsc);
  }, [onFechar]);

  const mudarStatus = async (novoStatus) => {
    const anterior = ficha.status;
    if (novoStatus === anterior) return;
    await onAtualizar(ficha.id, { status: novoStatus });
    await api
      .addFollowup({ proposta_id: ficha.id, nota: null, status_anterior: anterior, status_novo: novoStatus })
      .catch(() => {});
    carregarFollowups();
  };

  const salvarNegociacao = async () => {
    setSalvando(true);
    setAviso('');
    try {
      await onAtualizar(ficha.id, {
        veiculo_id: negociacao.veiculo_id || null,
        valor_venda_centavos: negociacao.valor_venda ? Number(onlyDigits(negociacao.valor_venda)) : null,
        valor_entrada_centavos: negociacao.valor_entrada ? Number(onlyDigits(negociacao.valor_entrada)) : null,
        instituicao_financeira: negociacao.instituicao_financeira.trim() || null,
        indicacao: negociacao.indicacao.trim() || null,
        regiao: negociacao.regiao.trim() || null,
        responsavel: negociacao.responsavel.trim() || null,
        observacoes: negociacao.observacoes.trim() || null,
      });
      setAviso('Negociação salva.');
      setTimeout(() => setAviso(''), 2500);
    } catch (error) {
      setAviso(`Erro ao salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const registrarNota = async () => {
    if (!nota.trim()) return;
    await api.addFollowup({ proposta_id: ficha.id, nota: nota.trim(), status_anterior: null, status_novo: null });
    setNota('');
    carregarFollowups();
  };

  const campo = (chave, mascara) => (event) =>
    setNegociacao((atual) => ({
      ...atual,
      [chave]: mascara ? maskCurrency(event.target.value) : event.target.value,
    }));

  const whatsapp = ficha.celular ? `https://wa.me/55${ficha.celular}` : null;

  return (
    <div className="crm-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="ficha-drawer" role="dialog" aria-modal="true" aria-label={`Ficha de ${nomeDa(ficha)}`}>
        <div className="drawer-topo">
          <div>
            <span className="mono drawer-protocolo">{ficha.protocolo}</span>
            <h2>{nomeDa(ficha)}</h2>
            <div className="drawer-meta">
              <span className={`status-pill cor-${STATUS_META[ficha.status]?.cor}`}>
                {STATUS_META[ficha.status]?.label}
              </span>
              <span className={`espera ${espera.nivel}`}>
                <Clock size={13} /> {espera.label} sem movimentação
              </span>
              <span>Recebida em {fmtDate(ficha.criado_em)}</span>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onFechar} aria-label="Fechar ficha">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-corpo">
          <section>
            <h3>Situação da ficha</h3>
            <div className="status-botoes">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`status-botao cor-${STATUS_META[s.value].cor} ${ficha.status === s.value ? 'ativo' : ''}`}
                  onClick={() => mudarStatus(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3><CarFront size={16} /> Negociação</h3>
            <div className="negociacao-grid">
              <div className="span-2">
                <label>Carro vinculado</label>
                <select value={negociacao.veiculo_id || ''} onChange={campo('veiculo_id')}>
                  <option value="">Nenhum carro vinculado</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome} · {v.placa} · {fmtBRL(v.preco_centavos)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Valor de venda</label>
                <input value={negociacao.valor_venda || ''} onChange={campo('valor_venda', true)} inputMode="numeric" placeholder="R$ 0,00" />
              </div>
              <div>
                <label>Valor de entrada</label>
                <input value={negociacao.valor_entrada || ''} onChange={campo('valor_entrada', true)} inputMode="numeric" placeholder="R$ 0,00" />
              </div>
              <div>
                <label>Instituição financeira</label>
                <input value={negociacao.instituicao_financeira || ''} onChange={campo('instituicao_financeira')} placeholder="Ex.: Santander" />
              </div>
              <div>
                <label>Indicação</label>
                <input value={negociacao.indicacao || ''} onChange={campo('indicacao')} placeholder="Ex.: Instagram, amigo" />
              </div>
              <div>
                <label>Região</label>
                <input value={negociacao.regiao || ''} onChange={campo('regiao')} placeholder="Bairro / cidade" />
              </div>
              <div>
                <label>Responsável</label>
                <input value={negociacao.responsavel || ''} onChange={campo('responsavel')} placeholder="Vendedor" />
              </div>
              <div className="span-2">
                <label>Observações internas</label>
                <textarea value={negociacao.observacoes || ''} onChange={campo('observacoes')} rows={2} />
              </div>
            </div>
            <div className="negociacao-acoes">
              {aviso && <span className="salvo-aviso">{aviso}</span>}
              <button type="button" className="button-primary" onClick={salvarNegociacao} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar negociação'}
              </button>
            </div>
          </section>

          <section>
            <h3>Dados do cliente</h3>
            <div className="info-grid">
              <Info rotulo="CPF">{fmtCPF(ficha.cpf)}</Info>
              <Info rotulo="Idade">{idade != null ? `${idade} anos (${fmtDate(cliente.dataNascimento)})` : null}</Info>
              <Info rotulo="Celular">
                {whatsapp ? (
                  <a href={whatsapp} target="_blank" rel="noreferrer" className="link-wa">
                    <Phone size={13} /> {fmtPhone(ficha.celular)}
                  </a>
                ) : null}
              </Info>
              <Info rotulo="E-mail">{ficha.email}</Info>
              <Info rotulo="Estado civil">{cliente.estadoCivil}</Info>
              <Info rotulo="CNH">{cliente.possuiCnh ? 'Sim' : 'Não'}</Info>
              <Info rotulo="Endereço">
                {[residencia.logradouro, residencia.numero, residencia.bairro].filter(Boolean).join(', ') || null}
              </Info>
              <Info rotulo="Renda mensal">{fmtBRL(ficha.renda_mensal_centavos)}</Info>
              <Info rotulo="Empresa">{trabalho.empresa}</Info>
              <Info rotulo="Cargo">{trabalho.cargo}</Info>
            </div>
            {referencias.length > 0 && (
              <div className="referencias-linha">
                <span className="info-rotulo">Referências</span>
                <span>
                  {referencias
                    .map((r) => [r.nome, r.parentesco && `(${r.parentesco})`, r.telefone && fmtPhone(r.telefone)].filter(Boolean).join(' '))
                    .join(' · ')}
                </span>
              </div>
            )}
          </section>

          <section>
            <h3><MessageSquarePlus size={16} /> Follow-up</h3>
            <div className="nota-form">
              <input
                value={nota}
                onChange={(event) => setNota(event.target.value)}
                placeholder="Registrar contato, retorno do banco, combinado com o cliente..."
                onKeyDown={(event) => event.key === 'Enter' && registrarNota()}
              />
              <button type="button" className="button-primary" onClick={registrarNota} disabled={!nota.trim()}>
                Registrar
              </button>
            </div>
            <ul className="timeline">
              {followups.map((item) => (
                <li key={item.id}>
                  <span className="timeline-data">{fmtDateTime(item.criado_em)}</span>
                  <div>
                    {item.status_novo && (
                      <span className="timeline-status">
                        {STATUS_META[item.status_anterior]?.label || item.status_anterior || '—'}
                        {' → '}
                        <b>{STATUS_META[item.status_novo]?.label || item.status_novo}</b>
                      </span>
                    )}
                    {item.nota && <p>{item.nota}</p>}
                    {item.autor && <small>{item.autor}</small>}
                  </div>
                </li>
              ))}
              {followups.length === 0 && <li className="timeline-vazia">Nenhum registro ainda. Comece pelo primeiro contato!</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
