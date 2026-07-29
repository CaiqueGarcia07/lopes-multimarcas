import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FilterX,
  Images,
  LayoutGrid,
  LoaderCircle,
  Plus,
  Rows3,
  Search,
  Star,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card } from '@/components/ui/card.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { cn } from '@/lib/utils.js';

import { maskCurrency, onlyDigits } from '../../utils/form.js';
import { STATUS_VEICULO, VisaoGaleria, VisaoGrade, VisaoLista } from '../components/EstoqueViews.jsx';
import { PageHeading } from '../components/Pills.jsx';
import { fmtBRL } from '../lib/format.js';
import {
  CAMBIOS,
  CARROCERIAS,
  COMBUSTIVEIS,
  TIPOS_GASTO,
  fotosDe,
  gastosDe,
  novoGasto,
  textoBusca,
  totalGastos,
  valorLiquido,
} from '../lib/veiculo.js';

const TODOS = '__todos__';
const NENHUM = '__nenhum__';

const VISOES = [
  { id: 'galeria', label: 'Galeria com foto', icone: Images },
  { id: 'grade', label: 'Quadro', icone: LayoutGrid },
  { id: 'lista', label: 'Lista', icone: Rows3 },
];

const ORDENACOES = {
  nome: { label: 'Nome (A–Z)', comparar: (a, b) => a.nome.localeCompare(b.nome) },
  preco_desc: { label: 'Maior preço', comparar: (a, b) => (b.preco_centavos || 0) - (a.preco_centavos || 0) },
  preco_asc: { label: 'Menor preço', comparar: (a, b) => (a.preco_centavos || 0) - (b.preco_centavos || 0) },
  km_asc: { label: 'Menor km', comparar: (a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) },
  recentes: { label: 'Adicionados por último', comparar: (a, b) => (a.criado_em < b.criado_em ? 1 : -1) },
  gastos_desc: { label: 'Maior gasto', comparar: (a, b) => totalGastos(b) - totalGastos(a) },
  liquido_desc: { label: 'Maior valor líquido', comparar: (a, b) => (valorLiquido(b) || 0) - (valorLiquido(a) || 0) },
};

const filtroInicial = { status: '', carroceria: '', combustivel: '', cambio: '' };

const vazio = {
  nome: '',
  placa: '',
  km: '',
  preco: '',
  cor: '',
  ano_fabricacao: '',
  ano_modelo: '',
  carroceria: '',
  combustivel: '',
  cambio: '',
  status: 'disponivel',
  observacoes: '',
  gastos: [],
  fotos: [],
};

function SelectOpcional({ id, valor, onChange, opcoes, vazioLabel }) {
  return (
    <Select value={valor || NENHUM} onValueChange={(novo) => onChange(novo === NENHUM ? '' : novo)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NENHUM}>{vazioLabel}</SelectItem>
        {opcoes.map((opcao) => (
          <SelectItem key={opcao} value={opcao}>
            {opcao}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Filtro de barra: some quando o estoque não tem nenhuma opção daquele campo. */
function FiltroBarra({ label, valor, onChange, opcoes, className }) {
  if (opcoes.length === 0) return null;
  return (
    <Select value={valor || TODOS} onValueChange={(novo) => onChange(novo === TODOS ? '' : novo)}>
      <SelectTrigger size="sm" aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>{label}: todos</SelectItem>
        {opcoes.map(({ value, label: rotulo }) => (
          <SelectItem key={value} value={value}>
            {rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Fotos do veículo: envio, remoção e escolha da capa. */
function EditorFotos({ fotos, veiculoId, api, onChange }) {
  const arquivoRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const enviar = async (event) => {
    const arquivos = [...(event.target.files || [])];
    event.target.value = '';
    if (!arquivos.length) return;

    setEnviando(true);
    setErro('');
    try {
      const novas = [];
      for (const arquivo of arquivos) {
        if (!arquivo.type.startsWith('image/')) {
          setErro('Envie apenas imagens.');
          continue;
        }
        if (arquivo.size > 8 * 1024 * 1024) {
          setErro(`"${arquivo.name}" tem mais de 8 MB.`);
          continue;
        }
        novas.push(await api.uploadFotoVeiculo(veiculoId, arquivo));
      }
      if (novas.length) onChange([...fotos, ...novas]);
    } catch (error) {
      setErro(`Falha no envio: ${error.message}`);
    } finally {
      setEnviando(false);
    }
  };

  const remover = async (path) => {
    onChange(fotos.filter((f) => f.path !== path));
    api.deleteFotoVeiculo(path).catch(() => {});
  };

  const definirCapa = (path) => {
    const escolhida = fotos.find((f) => f.path === path);
    onChange([escolhida, ...fotos.filter((f) => f.path !== path)]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-bold tracking-tight">
          <Images className="size-4 text-brand-strong dark:text-brand" />
          Fotos do veículo
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[0.76rem] text-muted-foreground">A primeira foto é a capa</span>
          <input ref={arquivoRef} type="file" accept="image/*" multiple onChange={enviar} hidden />
          <Button type="button" variant="secondary" size="sm" onClick={() => arquivoRef.current?.click()} disabled={enviando}>
            {enviando ? <LoaderCircle className="animate-spin" /> : <Plus />}
            {enviando ? 'Enviando...' : 'Adicionar fotos'}
          </Button>
        </div>
      </div>

      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {fotos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-6 text-center text-[0.85rem] text-muted-foreground">
          Nenhuma foto enviada. As fotos aparecem na galeria do estoque.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {fotos.map((foto, indice) => (
            <li key={foto.path} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border">
              <img src={api.fotoUrl(foto.path)} alt="" className="size-full object-cover" />
              {indice === 0 && (
                <span className="absolute top-1 left-1 rounded bg-brand-strong px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                  Capa
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-[#0b0f14]/60 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {indice > 0 && (
                  <button
                    type="button"
                    onClick={() => definirCapa(foto.path)}
                    className="grid size-8 place-items-center rounded-md bg-white/15 text-white hover:bg-white/25"
                    aria-label="Definir como capa"
                    title="Definir como capa"
                  >
                    <Star className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remover(foto.path)}
                  className="grid size-8 place-items-center rounded-md bg-white/15 text-white hover:bg-destructive"
                  aria-label="Remover foto"
                  title="Remover foto"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Lista editável de gastos do veículo: peças, serviços, documentação. */
function EditorGastos({ gastos, preco, onChange }) {
  const total = gastos.reduce((soma, g) => soma + (Number(g.valor_centavos) || 0), 0);
  const liquido = preco == null ? null : preco - total;

  const atualizar = (id, campo, valor) =>
    onChange(gastos.map((g) => (g.id === id ? { ...g, [campo]: valor } : g)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-bold tracking-tight">
          <Wrench className="size-4 text-brand-strong dark:text-brand" />
          Gastos com o veículo
        </h3>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...gastos, novoGasto()])}>
          <Plus /> Adicionar gasto
        </Button>
      </div>

      {gastos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-6 text-center text-[0.85rem] text-muted-foreground">
          Nenhum gasto lançado. Inclua peças, manutenção mecânica, estética, documentação e serviços.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {gastos.map((gasto) => (
            <li
              key={gasto.id}
              className="grid gap-2.5 rounded-xl border border-border bg-secondary/40 p-3 sm:grid-cols-[10.5rem_minmax(0,1fr)_8rem_2.5rem]"
            >
              <Select value={gasto.tipo} onValueChange={(valor) => atualizar(gasto.id, 'tipo', valor)}>
                <SelectTrigger size="sm" aria-label="Tipo do gasto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_GASTO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                className="h-9"
                value={gasto.descricao}
                onChange={(e) => atualizar(gasto.id, 'descricao', e.target.value)}
                placeholder="Descrição do serviço ou peça"
                aria-label="Descrição do gasto"
              />

              <Input
                className="h-9 text-right tabular-nums"
                value={gasto.valor_centavos ? maskCurrency(String(gasto.valor_centavos)) : ''}
                onChange={(e) => atualizar(gasto.id, 'valor_centavos', Number(onlyDigits(e.target.value)) || 0)}
                inputMode="numeric"
                placeholder="R$ 0,00"
                aria-label="Valor do gasto"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="justify-self-end text-destructive hover:bg-destructive/10"
                onClick={() => onChange(gastos.filter((g) => g.id !== gasto.id))}
                aria-label={`Remover gasto ${gasto.descricao || gasto.tipo}`}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 rounded-xl border border-border px-4 py-3 text-[0.85rem]">
        <span className="text-muted-foreground">
          Total de gastos <strong className="ml-1.5 text-warning tabular-nums">{fmtBRL(total)}</strong>
        </span>
        <span className="text-muted-foreground">
          Valor líquido da venda{' '}
          <strong className="ml-1.5 font-display text-base text-foreground tabular-nums">{fmtBRL(liquido)}</strong>
        </span>
      </div>
    </div>
  );
}

export default function Estoque({ veiculos, fichas, api, onRecarregar }) {
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState(filtroInicial);
  const [ordenacao, setOrdenacao] = useState('nome');
  const [visao, setVisao] = useState(() => localStorage.getItem('crm-estoque-visao') || 'galeria');

  useEffect(() => {
    localStorage.setItem('crm-estoque-visao', visao);
  }, [visao]);

  const fichasPorVeiculo = useMemo(() => {
    const mapa = {};
    fichas.forEach((f) => {
      if (f.veiculo_id) mapa[f.veiculo_id] = (mapa[f.veiculo_id] || 0) + 1;
    });
    return mapa;
  }, [fichas]);

  // Só oferece filtros que existem no estoque atual.
  const opcoes = useMemo(() => {
    const presentes = (campo, ordem) => {
      const usados = new Set(veiculos.map((v) => v[campo]).filter(Boolean));
      return ordem.filter((item) => usados.has(item)).map((item) => ({ value: item, label: item }));
    };
    return {
      carrocerias: presentes('carroceria', CARROCERIAS),
      combustiveis: presentes('combustivel', COMBUSTIVEIS),
      cambios: presentes('cambio', CAMBIOS),
    };
  }, [veiculos]);

  const listados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return veiculos
      .filter((veiculo) => {
        if (termo && !textoBusca(veiculo).includes(termo)) return false;
        if (filtros.status && veiculo.status !== filtros.status) return false;
        if (filtros.carroceria && veiculo.carroceria !== filtros.carroceria) return false;
        if (filtros.combustivel && veiculo.combustivel !== filtros.combustivel) return false;
        if (filtros.cambio && veiculo.cambio !== filtros.cambio) return false;
        return true;
      })
      .sort(ORDENACOES[ordenacao].comparar);
  }, [veiculos, busca, filtros, ordenacao]);

  const temFiltro = Boolean(busca.trim()) || Object.values(filtros).some(Boolean);
  const valorListado = listados.reduce((soma, v) => soma + (v.preco_centavos || 0), 0);
  const gastoListado = listados.reduce((soma, v) => soma + totalGastos(v), 0);

  const abrirNovo = () => {
    setErro('');
    setEditando({ ...vazio, gastos: [], fotos: [] });
  };

  const abrirEdicao = (veiculo) => {
    setErro('');
    setEditando({
      id: veiculo.id,
      nome: veiculo.nome || '',
      placa: veiculo.placa || '',
      km: veiculo.km != null ? String(veiculo.km) : '',
      preco: veiculo.preco_centavos != null ? maskCurrency(String(veiculo.preco_centavos)) : '',
      cor: veiculo.cor || '',
      ano_fabricacao: veiculo.ano_fabricacao || '',
      ano_modelo: veiculo.ano_modelo || '',
      carroceria: veiculo.carroceria || '',
      combustivel: veiculo.combustivel || '',
      cambio: veiculo.cambio || '',
      status: veiculo.status,
      observacoes: veiculo.observacoes || '',
      gastos: gastosDe(veiculo).map((g) => ({ ...g })),
      fotos: fotosDe(veiculo).map((f) => ({ ...f })),
    });
  };

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
        ano_fabricacao: editando.ano_fabricacao.trim() || null,
        ano_modelo: editando.ano_modelo.trim() || null,
        carroceria: editando.carroceria || null,
        combustivel: editando.combustivel || null,
        cambio: editando.cambio || null,
        status: editando.status,
        observacoes: editando.observacoes.trim() || null,
        gastos: editando.gastos.filter((g) => g.valor_centavos > 0 || g.descricao.trim()),
        fotos: editando.fotos,
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

  const campo = (chave, mascara) => (event) =>
    setEditando((atual) => ({
      ...atual,
      [chave]: mascara ? maskCurrency(event.target.value) : event.target.value,
    }));

  const definir = (chave) => (valor) => setEditando((atual) => ({ ...atual, [chave]: valor }));
  const setFiltro = (chave) => (valor) => setFiltros((atual) => ({ ...atual, [chave]: valor }));

  const propsVisao = { veiculos: listados, fichasPorVeiculo, url: api.fotoUrl, onEditar: abrirEdicao, onExcluir: excluir };

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        titulo="Estoque de carros"
        descricao={
          temFiltro
            ? `${listados.length} de ${veiculos.length} veículos · ${fmtBRL(valorListado)} no filtro atual`
            : `${veiculos.length} veículos · ${fmtBRL(valorListado)} em estoque · ${fmtBRL(gastoListado)} em gastos`
        }
      >
        <Button variant="brand" size="sm" onClick={abrirNovo}>
          <Plus /> Novo veículo
        </Button>
      </PageHeading>

      <Card className="flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[15rem] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              className="h-9 pr-9 pl-10 [&::-webkit-search-cancel-button]:hidden"
              placeholder="Buscar carro por modelo, placa, cor, câmbio..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              aria-label="Buscar veículo no estoque"
            />
            {busca && (
              <button
                type="button"
                className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Select value={ordenacao} onValueChange={setOrdenacao}>
            <SelectTrigger size="sm" aria-label="Ordenar estoque" className="w-[13rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ORDENACOES).map(([valor, { label }]) => (
                <SelectItem key={valor} value={valor}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1 rounded-lg bg-secondary p-1" role="group" aria-label="Modo de visualização">
            {VISOES.map(({ id, label, icone: Icone }) => (
              <button
                key={id}
                type="button"
                onClick={() => setVisao(id)}
                title={label}
                aria-label={label}
                aria-pressed={visao === id}
                className={cn(
                  'grid size-8 place-items-center rounded-md transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35',
                  visao === id ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icone className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <FiltroBarra
            label="Situação"
            valor={filtros.status}
            onChange={setFiltro('status')}
            opcoes={Object.entries(STATUS_VEICULO).map(([value, meta]) => ({ value, label: meta.label }))}
            className="w-[10.5rem]"
          />
          <FiltroBarra
            label="Carroceria"
            valor={filtros.carroceria}
            onChange={setFiltro('carroceria')}
            opcoes={opcoes.carrocerias}
            className="w-[11rem]"
          />
          <FiltroBarra
            label="Combustível"
            valor={filtros.combustivel}
            onChange={setFiltro('combustivel')}
            opcoes={opcoes.combustiveis}
            className="w-[11.5rem]"
          />
          <FiltroBarra
            label="Câmbio"
            valor={filtros.cambio}
            onChange={setFiltro('cambio')}
            opcoes={opcoes.cambios}
            className="w-[10.5rem]"
          />
          {temFiltro && (
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setFiltros(filtroInicial);
                setBusca('');
              }}
            >
              <FilterX /> Limpar filtros
            </Button>
          )}
        </div>
      </Card>

      {listados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
          {temFiltro ? 'Nenhum veículo encontrado com esses critérios.' : 'Nenhum veículo cadastrado no estoque.'}
        </p>
      ) : (
        <>
          {visao === 'galeria' && <VisaoGaleria {...propsVisao} />}
          {visao === 'grade' && <VisaoGrade {...propsVisao} />}
          {visao === 'lista' && <VisaoLista {...propsVisao} />}
        </>
      )}

      <Dialog open={Boolean(editando)} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-w-3xl">
          {editando && (
            <form onSubmit={salvar} className="flex flex-col gap-5">
              <DialogHeader>
                <DialogTitle>{editando.id ? 'Editar veículo' : 'Novo veículo'}</DialogTitle>
                <DialogDescription>Ficha técnica, fotos, situação e gastos lançados no veículo.</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2">
                <Label htmlFor="veiculo-nome">
                  Nome / modelo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="veiculo-nome"
                  value={editando.nome}
                  onChange={campo('nome')}
                  placeholder="MARCA / MODELO VERSÃO"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="veiculo-placa">Placa</Label>
                  <Input id="veiculo-placa" value={editando.placa} onChange={campo('placa')} placeholder="ABC1D23" maxLength={8} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="veiculo-km">KM</Label>
                  <Input id="veiculo-km" value={editando.km} onChange={campo('km')} inputMode="numeric" placeholder="57.000" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="veiculo-preco">Preço de venda</Label>
                  <Input
                    id="veiculo-preco"
                    value={editando.preco}
                    onChange={campo('preco', true)}
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="veiculo-cor">Cor</Label>
                  <Input id="veiculo-cor" value={editando.cor} onChange={campo('cor')} placeholder="Branco" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="veiculo-ano-fab">Ano de fabricação</Label>
                  <Input
                    id="veiculo-ano-fab"
                    value={editando.ano_fabricacao}
                    onChange={campo('ano_fabricacao')}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="2024"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="veiculo-ano-mod">Ano do modelo</Label>
                  <Input id="veiculo-ano-mod" value={editando.ano_modelo} onChange={campo('ano_modelo')} placeholder="2025" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="veiculo-carroceria">Carroceria</Label>
                  <SelectOpcional
                    id="veiculo-carroceria"
                    valor={editando.carroceria}
                    onChange={definir('carroceria')}
                    opcoes={CARROCERIAS}
                    vazioLabel="Não informada"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="veiculo-combustivel">Combustível</Label>
                  <SelectOpcional
                    id="veiculo-combustivel"
                    valor={editando.combustivel}
                    onChange={definir('combustivel')}
                    opcoes={COMBUSTIVEIS}
                    vazioLabel="Não informado"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="veiculo-cambio">Câmbio</Label>
                  <SelectOpcional
                    id="veiculo-cambio"
                    valor={editando.cambio}
                    onChange={definir('cambio')}
                    opcoes={CAMBIOS}
                    vazioLabel="Não informado"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="veiculo-status">Situação</Label>
                  <Select value={editando.status} onValueChange={definir('status')}>
                    <SelectTrigger id="veiculo-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_VEICULO).map(([valor, meta]) => (
                        <SelectItem key={valor} value={valor}>
                          {meta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="veiculo-obs">Observações</Label>
                <Textarea
                  id="veiculo-obs"
                  value={editando.observacoes}
                  onChange={campo('observacoes')}
                  rows={2}
                  placeholder="Detalhes internos do veículo"
                />
              </div>

              <Separator />

              <EditorFotos
                fotos={editando.fotos}
                veiculoId={editando.id}
                api={api}
                onChange={definir('fotos')}
              />

              <Separator />

              <EditorGastos
                gastos={editando.gastos}
                preco={editando.preco ? Number(onlyDigits(editando.preco)) : null}
                onChange={definir('gastos')}
              />

              {erro && (
                <Alert variant="destructive">
                  <AlertDescription>{erro}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button variant="secondary" type="button" onClick={() => setEditando(null)}>
                  Cancelar
                </Button>
                <Button variant="brand" type="submit" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar veículo'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
