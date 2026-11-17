import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BriefcaseBusiness,
  CarFront,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Landmark,
  LoaderCircle,
  Lock,
  MessageCircle,
  MapPinHouse,
  MessageSquarePlus,
  Paperclip,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { cn } from '@/lib/utils.js';

import { maskCurrency, onlyDigits } from '../../utils/form.js';
import EnviarWhatsApp from '../components/EnviarWhatsApp.jsx';
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

const endereco = (bloco = {}) =>
  [
    [bloco.logradouro, bloco.numero].filter(Boolean).join(', '),
    bloco.complemento,
    bloco.bairro,
    [bloco.cidade, bloco.uf].filter(Boolean).join('/'),
  ]
    .filter(Boolean)
    .join(' — ') || null;

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
        'grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-secondary hover:text-foreground focus-visible:opacity-100',
        copiado ? 'text-emerald-500' : 'opacity-0 group-hover/info:opacity-100 max-sm:opacity-100',
      )}
    >
      {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** Par rótulo/valor. Trunca sozinho: nada aqui pode alargar o diálogo. */
function Info({ rotulo, valor, copia, children }) {
  const conteudo = children ?? valor;
  const vazio = conteudo == null || conteudo === '';
  return (
    <div className="group/info flex min-w-0 flex-col gap-1 rounded-md border border-border px-3 py-2">
      <span className="truncate text-[0.68rem] font-semibold tracking-wide text-muted-foreground uppercase">
        {rotulo}
      </span>
      <span className="flex min-h-6 min-w-0 items-center gap-1.5 text-[0.88rem] font-medium">
        <span className={cn('min-w-0 flex-1 truncate', vazio && 'text-muted-foreground/60')} title={typeof conteudo === 'string' ? conteudo : undefined}>
          {vazio ? '—' : conteudo}
        </span>
        {!vazio && copia != null && copia !== '' && <BotaoCopiar valor={copia} rotulo={rotulo.toLowerCase()} />}
      </span>
    </div>
  );
}

function Secao({ icone: Icone, titulo, acao, children }) {
  return (
    <Card className="min-w-0">
      <CardContent className="flex min-w-0 flex-col gap-4 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[0.92rem] font-semibold tracking-tight">
            {Icone && <Icone className="size-4 shrink-0 text-brand-strong dark:text-brand" />}
            {titulo}
          </h3>
          {acao}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/** Categoria de dados do formulário, aberta ou fechada pelo usuário. */
function Categoria({ valor, icone: Icone, titulo, resumo, children }) {
  return (
    <AccordionItem value={valor} className="min-w-0 rounded-md">
      <AccordionTrigger className="gap-3 px-4 py-3">
        <Icone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
          <strong className="truncate text-[0.88rem] font-semibold tracking-tight">{titulo}</strong>
          {resumo && <small className="truncate text-[0.76rem] font-normal text-muted-foreground">{resumo}</small>}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 py-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

const GradeInfo = ({ children }) => (
  <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">{children}</div>
);

export default function FichaDetail({ ficha, veiculos, api, onAtualizar, onFechar }) {
  const dados = ficha.dados || {};
  const cliente = dados.cliente || {};
  const residencia = dados.residencia || {};
  const trabalho = dados.trabalho || {};
  const bancarios = dados.dadosBancarios || {};
  const referencias = dados.referencias || [];
  const veiculoInteresse = dados.veiculoInteresse || null;
  const idade = idadeDe(cliente.dataNascimento);

  // Consentimento LGPD: registrado no envio da ficha, nunca editável no CRM.
  const autorizado = ficha.consentimento_autorizado ?? dados.consentimento?.autorizado ?? false;
  const versaoConsentimento = ficha.consentimento_texto_versao || dados.consentimento?.textoVersao || null;

  const [negociacao, setNegociacao] = useState({});
  const [followups, setFollowups] = useState([]);
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [anexos, setAnexos] = useState([]);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState('');
  const [categoriasAbertas, setCategoriasAbertas] = useState(['identificacao']);
  const arquivoRef = useRef(null);

  const TODAS_CATEGORIAS = ['identificacao', 'residencia', 'trabalho', 'bancarios', 'referencias', 'veiculo'];
  const tudoAberto = categoriasAbertas.length === TODAS_CATEGORIAS.length;

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
  const bancosListados =
    negociacao.instituicao_financeira && !BANCOS.includes(negociacao.instituicao_financeira)
      ? [negociacao.instituicao_financeira, ...BANCOS]
      : BANCOS;

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="min-w-0 gap-1 border-b border-border px-4 py-4 pr-14 sm:px-6">
          <span className="font-mono text-[0.76rem] tracking-wide text-muted-foreground">{ficha.protocolo}</span>
          <DialogTitle className="truncate text-lg sm:text-xl">{nomeDa(ficha)}</DialogTitle>
          <DialogDescription className="sr-only">
            Ficha cadastral completa, negociação, anexos e histórico de contatos.
          </DialogDescription>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.78rem] text-muted-foreground">
            <StatusPill status={ficha.status} />
            <EsperaPill ficha={ficha} icone={Clock} sufixo="sem movimentação" />
            <span>Recebida em {fmtDate(ficha.criado_em)}</span>
            {ficha.origem === 'meta-ads' && (
              <Badge variant="outline" className="border-brand/30 bg-brand-soft text-accent-foreground">
                Meta Ads{ficha.dados?.meta?.campanha ? ` · ${ficha.dados.meta.campanha}` : ''}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onFechar}
            aria-label="Fechar ficha"
            className="absolute top-3.5 right-3.5"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </Button>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-auto scrollbar-slim px-4 py-4 sm:px-6 sm:py-5">
          <Secao titulo="Situação da ficha">
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => mudarStatus(s.value)}
                  className={cn(
                    'rounded-md border px-2.5 py-1.5 text-[0.8rem] font-semibold transition-all outline-none',
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

          <Secao icone={MessageCircle} titulo="Mensagem no WhatsApp">
            <EnviarWhatsApp ficha={ficha} api={api} onAtualizar={onAtualizar} onEnviado={carregarFollowups} />
          </Secao>

          <Secao icone={ShieldCheck} titulo="Autorização de uso dos dados">
            <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-md border border-emerald-500/25 bg-emerald-500/8 px-3.5 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Lock className="size-4" />
              </span>
              <div className="min-w-[12rem] flex-1">
                <strong className="block text-[0.88rem]">
                  {autorizado
                    ? 'Cliente autorizou o uso dos dados para simulações'
                    : 'Sem registro de autorização nesta ficha'}
                </strong>
                <span className="text-[0.76rem] text-muted-foreground">
                  {autorizado
                    ? `Aceite registrado em ${fmtDateTime(ficha.criado_em)}${versaoConsentimento ? ` · texto versão ${versaoConsentimento}` : ''} — análise de crédito e simulação de financiamento (LGPD, Lei nº 13.709/2018).`
                    : 'Ficha anterior ao registro de consentimento ou importada manualmente.'}
                </span>
              </div>
              <Badge variant="outline" className="border-border text-muted-foreground">
                <Lock /> Somente leitura
              </Badge>
            </div>
          </Secao>

          {ficha.dados?.meta?.respostas?.length > 0 && (
            <Secao titulo="Respostas do formulário do Meta">
              <GradeInfo>
                {ficha.dados.meta.respostas.map((r) => (
                  <Info key={r.campo} rotulo={r.rotulo || r.campo} valor={r.valor} copia={r.valor} />
                ))}
              </GradeInfo>
            </Secao>
          )}

          <Secao icone={CarFront} titulo="Negociação">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
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

              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="neg-venda">Valor de venda</Label>
                <Input
                  id="neg-venda"
                  value={negociacao.valor_venda || ''}
                  onChange={campo('valor_venda', true)}
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="neg-entrada">Valor de entrada</Label>
                <Input
                  id="neg-entrada"
                  value={negociacao.valor_entrada || ''}
                  onChange={campo('valor_entrada', true)}
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="flex min-w-0 flex-col gap-2">
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
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="neg-indicacao">Indicação</Label>
                <Input
                  id="neg-indicacao"
                  value={negociacao.indicacao || ''}
                  onChange={campo('indicacao')}
                  placeholder="Ex.: Instagram, amigo"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="neg-regiao">Região</Label>
                <Input
                  id="neg-regiao"
                  value={negociacao.regiao || ''}
                  onChange={campo('regiao')}
                  placeholder="Bairro / cidade"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="neg-responsavel">Responsável</Label>
                <Input
                  id="neg-responsavel"
                  value={negociacao.responsavel || ''}
                  onChange={campo('responsavel')}
                  placeholder="Vendedor"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
                <Label htmlFor="neg-obs">Observações internas</Label>
                <Textarea id="neg-obs" value={negociacao.observacoes || ''} onChange={campo('observacoes')} rows={2} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {aviso && (
                <span className="text-[0.8rem] font-semibold text-emerald-600 dark:text-emerald-400">{aviso}</span>
              )}
              <Button variant="brand" size="sm" onClick={salvarNegociacao} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar negociação'}
              </Button>
            </div>
          </Secao>

          <Secao
            icone={UserRound}
            titulo="Dados do cliente"
            acao={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCategoriasAbertas(tudoAberto ? [] : TODAS_CATEGORIAS)}
              >
                {tudoAberto ? 'Recolher tudo' : 'Expandir tudo'}
              </Button>
            }
          >
            <p className="-mt-1 text-[0.78rem] text-muted-foreground">
              Tudo que o cliente preencheu no formulário. Abra ou feche cada categoria.
            </p>

            <Accordion
              type="multiple"
              value={categoriasAbertas}
              onValueChange={setCategoriasAbertas}
              className="flex min-w-0 flex-col gap-2"
            >
              <Categoria
                valor="identificacao"
                icone={UserRound}
                titulo="Identificação"
                resumo={[fmtCPF(ficha.cpf), idade != null && `${idade} anos`].filter(Boolean).join(' · ')}
              >
                <GradeInfo>
                  <Info rotulo="Nome completo" valor={nomeDa(ficha)} copia={nomeDa(ficha)} />
                  <Info rotulo="CPF" valor={fmtCPF(ficha.cpf)} copia={ficha.cpf} />
                  <Info rotulo="RG" valor={cliente.rg} copia={cliente.rg} />
                  <Info
                    rotulo="Nascimento"
                    valor={cliente.dataNascimento ? `${fmtDate(cliente.dataNascimento)}${idade != null ? ` (${idade} anos)` : ''}` : null}
                    copia={cliente.dataNascimento ? fmtDate(cliente.dataNascimento) : null}
                  />
                  <Info rotulo="Estado civil" valor={cliente.estadoCivil} copia={cliente.estadoCivil} />
                  <Info rotulo="Possui CNH" valor={cliente.possuiCnh ? 'Sim' : 'Não'} />
                  <Info rotulo="Nome da mãe" valor={cliente.nomeMae} copia={cliente.nomeMae} />
                  <Info rotulo="Nome do pai" valor={cliente.nomePai} copia={cliente.nomePai} />
                  <Info
                    rotulo="Naturalidade"
                    valor={[cliente.cidadeNascimento, cliente.ufNascimento].filter(Boolean).join('/')}
                    copia={[cliente.cidadeNascimento, cliente.ufNascimento].filter(Boolean).join('/')}
                  />
                  <Info rotulo="E-mail" valor={ficha.email} copia={ficha.email} />
                </GradeInfo>
              </Categoria>

              <Categoria
                valor="residencia"
                icone={MapPinHouse}
                titulo="Endereço e contato"
                resumo={endereco(residencia) || fmtPhone(ficha.celular)}
              >
                <GradeInfo>
                  <Info rotulo="Celular" copia={ficha.celular}>
                    {whatsapp ? (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        <Phone className="size-3.5 shrink-0" /> {fmtPhone(ficha.celular)}
                      </a>
                    ) : null}
                  </Info>
                  <Info rotulo="Telefone fixo" valor={residencia.telefoneFixo ? fmtPhone(residencia.telefoneFixo) : null} copia={residencia.telefoneFixo} />
                  <Info rotulo="CEP" valor={residencia.cep} copia={residencia.cep} />
                  <Info rotulo="Tempo de residência" valor={residencia.tempoResidencia} />
                  <Info rotulo="Rua / Avenida" valor={residencia.logradouro} copia={residencia.logradouro} />
                  <Info rotulo="Número" valor={residencia.numero} />
                  <Info rotulo="Complemento" valor={residencia.complemento} />
                  <Info rotulo="Bairro" valor={residencia.bairro} copia={residencia.bairro} />
                  <Info rotulo="Cidade" valor={residencia.cidade} copia={residencia.cidade} />
                  <Info rotulo="UF" valor={residencia.uf} />
                  <Info rotulo="Endereço completo" valor={endereco(residencia)} copia={endereco(residencia)} />
                </GradeInfo>
              </Categoria>

              <Categoria
                valor="trabalho"
                icone={BriefcaseBusiness}
                titulo="Dados profissionais"
                resumo={
                  [trabalho.empresa, ficha.renda_mensal_centavos != null && fmtBRL(ficha.renda_mensal_centavos)]
                    .filter(Boolean)
                    .join(' · ') || 'Não informado'
                }
              >
                <GradeInfo>
                  <Info rotulo="Empresa" valor={trabalho.empresa} copia={trabalho.empresa} />
                  <Info rotulo="Cargo" valor={trabalho.cargo} copia={trabalho.cargo} />
                  <Info rotulo="Tempo de empresa" valor={trabalho.tempoEmpresa} />
                  <Info
                    rotulo="Renda mensal"
                    valor={ficha.renda_mensal_centavos != null ? fmtBRL(ficha.renda_mensal_centavos) : null}
                    copia={ficha.renda_mensal_centavos != null ? fmtBRL(ficha.renda_mensal_centavos) : null}
                  />
                  <Info rotulo="CNPJ" valor={trabalho.cnpj} copia={trabalho.cnpj} />
                  <Info rotulo="Telefone da empresa" valor={trabalho.telefoneFixo ? fmtPhone(trabalho.telefoneFixo) : null} copia={trabalho.telefoneFixo} />
                  <Info rotulo="Endereço da empresa" valor={endereco(trabalho)} copia={endereco(trabalho)} />
                  <Info rotulo="CEP da empresa" valor={trabalho.cep} copia={trabalho.cep} />
                </GradeInfo>
              </Categoria>

              <Categoria
                valor="bancarios"
                icone={Landmark}
                titulo="Dados bancários"
                resumo={bancarios.banco || 'Não informado'}
              >
                <GradeInfo>
                  <Info rotulo="Banco" valor={bancarios.banco} copia={bancarios.banco} />
                  <Info rotulo="Agência" valor={bancarios.agencia} copia={bancarios.agencia} />
                  <Info rotulo="Conta" valor={bancarios.conta} copia={bancarios.conta} />
                </GradeInfo>
              </Categoria>

              <Categoria
                valor="referencias"
                icone={UsersRound}
                titulo="Referências pessoais"
                resumo={referencias.length ? `${referencias.length} referência${referencias.length > 1 ? 's' : ''}` : 'Nenhuma'}
              >
                {referencias.length === 0 ? (
                  <p className="text-[0.85rem] text-muted-foreground">Nenhuma referência informada.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {referencias.map((r, indice) => (
                      <div key={`${r.nome}-${indice}`} className="min-w-0">
                        <span className="mb-1.5 block text-[0.68rem] font-semibold tracking-wide text-muted-foreground uppercase">
                          Referência {String(indice + 1).padStart(2, '0')}
                        </span>
                        <GradeInfo>
                          <Info rotulo="Nome" valor={r.nome} copia={r.nome} />
                          <Info rotulo="Parentesco" valor={r.parentesco} />
                          <Info rotulo="Telefone" valor={r.telefone ? fmtPhone(r.telefone) : null} copia={r.telefone} />
                        </GradeInfo>
                      </div>
                    ))}
                  </div>
                )}
              </Categoria>

              <Categoria
                valor="veiculo"
                icone={CarFront}
                titulo="Veículo escolhido no site"
                resumo={veiculoInteresse?.nome || 'Cliente não escolheu na vitrine'}
              >
                {veiculoInteresse ? (
                  <GradeInfo>
                    <Info rotulo="Marca / modelo" valor={veiculoInteresse.nome} copia={veiculoInteresse.nome} />
                    <Info
                      rotulo="Valor anunciado"
                      valor={veiculoInteresse.precoCentavos != null ? fmtBRL(veiculoInteresse.precoCentavos) : null}
                    />
                    <Info rotulo="Cor" valor={veiculoInteresse.cor} />
                    <Info rotulo="Carroceria" valor={veiculoInteresse.carroceria} />
                    <Info rotulo="Ano do modelo" valor={veiculoInteresse.anoModelo} />
                  </GradeInfo>
                ) : (
                  <p className="text-[0.85rem] text-muted-foreground">
                    O cliente não selecionou um carro na vitrine do site.
                  </p>
                )}
              </Categoria>
            </Accordion>
          </Secao>

          <Secao icone={Paperclip} titulo="Anexos">
            <div className="flex flex-wrap items-center gap-3">
              <input ref={arquivoRef} type="file" accept="image/*,application/pdf" onChange={enviarAnexo} hidden />
              <Button variant="secondary" size="sm" onClick={() => arquivoRef.current?.click()} disabled={enviandoAnexo}>
                {enviandoAnexo ? <LoaderCircle className="animate-spin" /> : <Paperclip />}
                {enviandoAnexo ? 'Enviando...' : 'Anexar imagem ou PDF'}
              </Button>
              <span className="min-w-[12rem] flex-1 text-[0.76rem] text-muted-foreground">
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
                  <li key={anexo.path} className="flex min-w-0 items-center gap-3 rounded-md border border-border px-3 py-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
                      {anexo.tipo === 'pdf' ? <FileText className="size-4" /> : <ImageIcon className="size-4" />}
                    </span>
                    <button
                      type="button"
                      onClick={() => abrirAnexo(anexo)}
                      title="Abrir em nova aba"
                      className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-left text-[0.86rem] font-semibold hover:text-brand-strong hover:underline dark:hover:text-brand"
                    >
                      <span className="truncate">{anexo.nome}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </button>
                    <span className="hidden shrink-0 text-[0.74rem] text-muted-foreground tabular-nums sm:inline">
                      {anexo.tamanho ? `${(anexo.tamanho / 1024 / 1024).toFixed(1)} MB` : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removerAnexo(anexo)}
                      aria-label={`Excluir ${anexo.nome}`}
                      className="shrink-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao icone={MessageSquarePlus} titulo="Follow-up">
            <div className="flex min-w-0 flex-wrap gap-2.5">
              <Input
                className="min-w-[12rem] flex-1"
                value={nota}
                onChange={(event) => setNota(event.target.value)}
                placeholder="Registrar contato, retorno do banco, combinado..."
                onKeyDown={(event) => event.key === 'Enter' && registrarNota()}
              />
              <Button variant="brand" onClick={registrarNota} disabled={!nota.trim()}>
                Registrar
              </Button>
            </div>

            <ul className="flex min-w-0 flex-col gap-3 border-l-2 border-border pl-4">
              {followups.map((item) => (
                <li key={item.id} className="relative min-w-0">
                  <span className="absolute top-2 -left-[1.32rem] size-2.5 rounded-full bg-brand ring-4 ring-card" />
                  <span className="text-[0.7rem] font-semibold text-muted-foreground tabular-nums">
                    {fmtDateTime(item.criado_em)}
                  </span>
                  <div className="mt-0.5 min-w-0">
                    {item.status_novo && (
                      <span className="text-[0.84rem]">
                        {STATUS_META[item.status_anterior]?.label || item.status_anterior || '—'}
                        {' → '}
                        <b>{STATUS_META[item.status_novo]?.label || item.status_novo}</b>
                      </span>
                    )}
                    {item.nota && <p className="text-[0.86rem] leading-relaxed break-words">{item.nota}</p>}
                    {item.autor && <small className="text-[0.7rem] text-muted-foreground">{item.autor}</small>}
                  </div>
                </li>
              ))}
              {followups.length === 0 && (
                <li className="py-3 text-[0.84rem] text-muted-foreground">
                  Nenhum registro ainda. Comece pelo primeiro contato!
                </li>
              )}
            </ul>
          </Secao>
        </div>
      </DialogContent>
    </Dialog>
  );
}
