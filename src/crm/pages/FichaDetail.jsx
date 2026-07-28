import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CarFront,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  MessageSquarePlus,
  Paperclip,
  Phone,
  Trash2,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { cn } from '@/lib/utils.js';

import { maskCurrency, onlyDigits } from '../../utils/form.js';
import { EsperaPill, StatusPill } from '../components/Pills.jsx';
import {
  STATUS_META,
  STATUS_OPTIONS,
  corDoStatus,
  fmtBRL,
  fmtCPF,
  fmtDate,
  fmtDateTime,
  fmtPhone,
  idadeDe,
  nomeDa,
} from '../lib/format.js';

const BANCOS = [
  'BV FINANCEIRA',
  'BRADESCO',
  'BRADESCO TURBO',
  'ITAÚ',
  'MERCADO LIVRE',
  'C6',
  'CREDITAS',
  'OMNI',
  'BANCO PAN',
  'SANTANDER',
  'DAYCOVAL',
  'SAFRA',
];

// O Radix Select reserva a string vazia para "sem valor".
const NENHUM = '__nenhum__';

function BotaoCopiar({ valor, rotulo }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(String(valor));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sem acesso à área de transferência; o dado segue visível para seleção manual.
    }
  };

  return (
    <button
      type="button"
      onClick={copiar}
      title={copiado ? 'Copiado!' : `Copiar ${rotulo}`}
      aria-label={copiado ? 'Copiado' : `Copiar ${rotulo}`}
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-all',
        'group-hover/info:opacity-100 focus-visible:opacity-100 hover:bg-secondary hover:text-foreground',
        copiado && 'opacity-100 text-emerald-500',
      )}
    >
      {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function Info({ rotulo, copia, children }) {
  return (
    <div className="group/info flex flex-col gap-1 rounded-lg border border-border px-3.5 py-2.5">
      <span className="text-[0.7rem] font-bold tracking-wide text-muted-foreground uppercase">{rotulo}</span>
      <span className="flex min-h-6 items-center gap-1.5 text-[0.9rem] font-medium">
        <span className="min-w-0 flex-1 truncate">{children ?? '—'}</span>
        {copia != null && copia !== '' && <BotaoCopiar valor={copia} rotulo={rotulo.toLowerCase()} />}
      </span>
    </div>
  );
}

function Secao({ icone: Icone, titulo, children }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-bold tracking-tight">
          {Icone && <Icone className="size-4 text-brand-strong dark:text-brand" />}
          {titulo}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

export default function FichaDetail({ ficha, veiculos, api, onAtualizar, onFechar }) {
  const dados = ficha.dados || {};
  const cliente = dados.cliente || {};
  const residencia = dados.residencia || {};
  const trabalho = dados.trabalho || {};
  const referencias = dados.referencias || [];
  const idade = idadeDe(cliente.dataNascimento);

  const [negociacao, setNegociacao] = useState({});
  const [followups, setFollowups] = useState([]);
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [anexos, setAnexos] = useState([]);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState('');
  const arquivoRef = useRef(null);

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

  const carregarAnexos = useCallback(() => {
    api.listAnexos(ficha.id).then(setAnexos).catch(() => setAnexos([]));
  }, [api, ficha.id]);

  useEffect(() => {
    carregarFollowups();
    carregarAnexos();
  }, [carregarFollowups, carregarAnexos]);

  const enviarAnexo = async (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    if (!/^image\/|^application\/pdf$/.test(arquivo.type)) {
      setErroAnexo('Apenas imagens ou PDF.');
      return;
    }
    if (arquivo.size > 10 * 1024 * 1024) {
      setErroAnexo('Arquivo acima de 10 MB.');
      return;
    }
    setEnviandoAnexo(true);
    setErroAnexo('');
    try {
      await api.uploadAnexo(ficha.id, arquivo);
      carregarAnexos();
    } catch (error) {
      setErroAnexo(`Falha no envio: ${error.message}`);
    } finally {
      setEnviandoAnexo(false);
    }
  };

  const abrirAnexo = async (anexo) => {
    try {
      const url = await api.getAnexoUrl(anexo.path);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      setErroAnexo(`Não foi possível abrir: ${error.message}`);
    }
  };

  const removerAnexo = async (anexo) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Excluir o anexo "${anexo.nome}"?`)) return;
    await api.deleteAnexo(anexo.path);
    carregarAnexos();
  };

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
        instituicao_financeira: (negociacao.instituicao_financeira || '').trim() || null,
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

  const definir = (chave) => (valor) => setNegociacao((atual) => ({ ...atual, [chave]: valor }));

  const whatsapp = ficha.celular ? `https://wa.me/55${ficha.celular}` : null;
  const bancosListados = negociacao.instituicao_financeira && !BANCOS.includes(negociacao.instituicao_financeira)
    ? [negociacao.instituicao_financeira, ...BANCOS]
    : BANCOS;

  return (
    <Sheet open onOpenChange={(aberto) => !aberto && onFechar()}>
      <SheetContent aria-label={`Ficha de ${nomeDa(ficha)}`}>
        <SheetHeader>
          <span className="font-mono text-[0.8rem] tracking-wide text-muted-foreground">{ficha.protocolo}</span>
          <SheetTitle>{nomeDa(ficha)}</SheetTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.8rem] text-muted-foreground">
            <StatusPill status={ficha.status} />
            <EsperaPill ficha={ficha} icone={Clock} sufixo="sem movimentação" />
            <span>Recebida em {fmtDate(ficha.criado_em)}</span>
          </div>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-5">
          <Secao titulo="Situação da ficha">
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => mudarStatus(s.value)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-[0.82rem] font-bold transition-all outline-none',
                    'focus-visible:ring-[3px] focus-visible:ring-brand/35',
                    ficha.status === s.value
                      ? cn(corDoStatus(s.value).pill, 'ring-2 ring-current/25')
                      : 'border-border text-muted-foreground hover:border-brand/40 hover:bg-secondary',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Secao>

          <Secao icone={CarFront} titulo="Negociação">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="neg-veiculo">Carro vinculado</Label>
                <Select
                  value={negociacao.veiculo_id || NENHUM}
                  onValueChange={(valor) => definir('veiculo_id')(valor === NENHUM ? '' : valor)}
                >
                  <SelectTrigger id="neg-veiculo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Nenhum carro vinculado</SelectItem>
                    {veiculos.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nome} · {v.placa} · {fmtBRL(v.preco_centavos)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="neg-venda">Valor de venda</Label>
                <Input
                  id="neg-venda"
                  value={negociacao.valor_venda || ''}
                  onChange={campo('valor_venda', true)}
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="neg-entrada">Valor de entrada</Label>
                <Input
                  id="neg-entrada"
                  value={negociacao.valor_entrada || ''}
                  onChange={campo('valor_entrada', true)}
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="neg-banco">Instituição financeira</Label>
                <Select
                  value={negociacao.instituicao_financeira || NENHUM}
                  onValueChange={(valor) => definir('instituicao_financeira')(valor === NENHUM ? '' : valor)}
                >
                  <SelectTrigger id="neg-banco">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Nenhuma / aguardando</SelectItem>
                    {bancosListados.map((banco) => (
                      <SelectItem key={banco} value={banco}>
                        {banco}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="neg-indicacao">Indicação</Label>
                <Input
                  id="neg-indicacao"
                  value={negociacao.indicacao || ''}
                  onChange={campo('indicacao')}
                  placeholder="Ex.: Instagram, amigo"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="neg-regiao">Região</Label>
                <Input
                  id="neg-regiao"
                  value={negociacao.regiao || ''}
                  onChange={campo('regiao')}
                  placeholder="Bairro / cidade"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="neg-responsavel">Responsável</Label>
                <Input
                  id="neg-responsavel"
                  value={negociacao.responsavel || ''}
                  onChange={campo('responsavel')}
                  placeholder="Vendedor"
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="neg-obs">Observações internas</Label>
                <Textarea id="neg-obs" value={negociacao.observacoes || ''} onChange={campo('observacoes')} rows={2} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {aviso && <span className="text-[0.82rem] font-semibold text-emerald-600 dark:text-emerald-400">{aviso}</span>}
              <Button variant="brand" size="sm" onClick={salvarNegociacao} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar negociação'}
              </Button>
            </div>
          </Secao>

          <Tabs defaultValue="cliente">
            <TabsList>
              <TabsTrigger value="cliente">Cliente</TabsTrigger>
              <TabsTrigger value="anexos">
                <Paperclip /> Anexos {anexos.length > 0 && `(${anexos.length})`}
              </TabsTrigger>
              <TabsTrigger value="followup">
                <MessageSquarePlus /> Follow-up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cliente">
              <Secao titulo="Dados do cliente">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Info rotulo="Nome completo" copia={nomeDa(ficha)}>{nomeDa(ficha)}</Info>
                  <Info rotulo="CPF" copia={ficha.cpf}>{fmtCPF(ficha.cpf)}</Info>
                  <Info rotulo="Nascimento" copia={cliente.dataNascimento ? fmtDate(cliente.dataNascimento) : null}>
                    {idade != null ? `${fmtDate(cliente.dataNascimento)} (${idade} anos)` : null}
                  </Info>
                  <Info rotulo="Celular" copia={ficha.celular}>
                    {whatsapp ? (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        <Phone className="size-3.5" /> {fmtPhone(ficha.celular)}
                      </a>
                    ) : null}
                  </Info>
                  <Info rotulo="E-mail" copia={ficha.email}>{ficha.email}</Info>
                  <Info rotulo="Estado civil" copia={cliente.estadoCivil}>{cliente.estadoCivil}</Info>
                  <Info rotulo="CNH">{cliente.possuiCnh ? 'Sim' : 'Não'}</Info>
                  <Info
                    rotulo="Endereço"
                    copia={[residencia.logradouro, residencia.numero, residencia.bairro].filter(Boolean).join(', ') || null}
                  >
                    {[residencia.logradouro, residencia.numero, residencia.bairro].filter(Boolean).join(', ') || null}
                  </Info>
                  <Info
                    rotulo="Renda mensal"
                    copia={ficha.renda_mensal_centavos != null ? fmtBRL(ficha.renda_mensal_centavos) : null}
                  >
                    {fmtBRL(ficha.renda_mensal_centavos)}
                  </Info>
                  <Info rotulo="Empresa" copia={trabalho.empresa}>{trabalho.empresa}</Info>
                  <Info rotulo="Cargo" copia={trabalho.cargo}>{trabalho.cargo}</Info>
                </div>

                {referencias.length > 0 && (
                  <div className="rounded-lg border border-dashed border-border px-3.5 py-3">
                    <span className="text-[0.7rem] font-bold tracking-wide text-muted-foreground uppercase">
                      Referências
                    </span>
                    <p className="mt-1 text-[0.88rem]">
                      {referencias
                        .map((r) =>
                          [r.nome, r.parentesco && `(${r.parentesco})`, r.telefone && fmtPhone(r.telefone)]
                            .filter(Boolean)
                            .join(' '),
                        )
                        .join(' · ')}
                    </p>
                  </div>
                )}
              </Secao>
            </TabsContent>

            <TabsContent value="anexos">
              <Secao icone={Paperclip} titulo="Anexos">
                <div className="flex flex-wrap items-center gap-3">
                  <input ref={arquivoRef} type="file" accept="image/*,application/pdf" onChange={enviarAnexo} hidden />
                  <Button variant="secondary" size="sm" onClick={() => arquivoRef.current?.click()} disabled={enviandoAnexo}>
                    {enviandoAnexo ? <LoaderCircle className="animate-spin" /> : <Paperclip />}
                    {enviandoAnexo ? 'Enviando...' : 'Anexar imagem ou PDF'}
                  </Button>
                  <span className="flex-1 text-[0.78rem] text-muted-foreground">
                    Documentos, comprovantes e fotos ficam guardados nesta ficha (até 10 MB cada).
                  </span>
                </div>

                {erroAnexo && (
                  <Alert variant="destructive">
                    <AlertDescription>{erroAnexo}</AlertDescription>
                  </Alert>
                )}

                {anexos.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {anexos.map((anexo) => (
                      <li
                        key={anexo.path}
                        className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                          {anexo.tipo === 'pdf' ? <FileText className="size-4" /> : <ImageIcon className="size-4" />}
                        </span>
                        <button
                          type="button"
                          onClick={() => abrirAnexo(anexo)}
                          title="Abrir em nova aba"
                          className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-left text-[0.88rem] font-semibold hover:text-brand-strong hover:underline dark:hover:text-brand"
                        >
                          <span className="truncate">{anexo.nome}</span>
                          <ExternalLink className="size-3 shrink-0" />
                        </button>
                        <span className="shrink-0 text-[0.75rem] text-muted-foreground tabular-nums">
                          {anexo.tamanho ? `${(anexo.tamanho / 1024 / 1024).toFixed(1)} MB` : ''}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removerAnexo(anexo)}
                          aria-label={`Excluir ${anexo.nome}`}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Secao>
            </TabsContent>

            <TabsContent value="followup">
              <Secao icone={MessageSquarePlus} titulo="Follow-up">
                <div className="flex gap-2.5">
                  <Input
                    value={nota}
                    onChange={(event) => setNota(event.target.value)}
                    placeholder="Registrar contato, retorno do banco, combinado com o cliente..."
                    onKeyDown={(event) => event.key === 'Enter' && registrarNota()}
                  />
                  <Button variant="brand" onClick={registrarNota} disabled={!nota.trim()}>
                    Registrar
                  </Button>
                </div>

                <ul className="flex flex-col gap-3 border-l-2 border-border pl-4">
                  {followups.map((item) => (
                    <li key={item.id} className="relative">
                      <span className="absolute top-2 -left-[1.32rem] size-2.5 rounded-full bg-brand ring-4 ring-card" />
                      <span className="text-[0.72rem] font-semibold text-muted-foreground tabular-nums">
                        {fmtDateTime(item.criado_em)}
                      </span>
                      <div className="mt-0.5">
                        {item.status_novo && (
                          <span className="text-[0.85rem]">
                            {STATUS_META[item.status_anterior]?.label || item.status_anterior || '—'}
                            {' → '}
                            <b>{STATUS_META[item.status_novo]?.label || item.status_novo}</b>
                          </span>
                        )}
                        {item.nota && <p className="text-[0.88rem] leading-relaxed">{item.nota}</p>}
                        {item.autor && <small className="text-[0.72rem] text-muted-foreground">{item.autor}</small>}
                      </div>
                    </li>
                  ))}
                  {followups.length === 0 && (
                    <li className="py-3 text-[0.85rem] text-muted-foreground">
                      Nenhum registro ainda. Comece pelo primeiro contato!
                    </li>
                  )}
                </ul>
              </Secao>
            </TabsContent>
          </Tabs>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
