import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Wrench } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
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

import { maskCurrency, onlyDigits } from '../../utils/form.js';
import { PageHeading } from '../components/Pills.jsx';
import { CORES, fmtBRL, fmtKm } from '../lib/format.js';
import {
  CAMBIOS,
  CARROCERIAS,
  COMBUSTIVEIS,
  TIPOS_GASTO,
  anoCompleto,
  fichaTecnica,
  gastosDe,
  novoGasto,
  percentualGastos,
  totalGastos,
  valorLiquido,
} from '../lib/veiculo.js';

const STATUS_VEICULO = {
  disponivel: { label: 'Disponível', cor: 'green' },
  reservado: { label: 'Reservado', cor: 'amber' },
  vendido: { label: 'Vendido', cor: 'gray' },
};

const TODOS = '__todos__';
const NENHUM = '__nenhum__';

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
};

/** Select simples com uma opção "não informado". */
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
  const gastoTotalEstoque = veiculos.reduce((soma, v) => soma + totalGastos(v), 0);

  const abrirNovo = () => {
    setErro('');
    setEditando({ ...vazio, gastos: [] });
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        titulo="Estoque de carros"
        descricao={`${veiculos.length} veículo${veiculos.length === 1 ? '' : 's'} · ${fmtBRL(gastoTotalEstoque)} em gastos lançados`}
      >
        <Select
          value={filtroStatus || TODOS}
          onValueChange={(valor) => setFiltroStatus(valor === TODOS ? '' : valor)}
        >
          <SelectTrigger size="sm" aria-label="Filtrar estoque" className="w-[10.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
            {Object.entries(STATUS_VEICULO).map(([valor, meta]) => (
              <SelectItem key={valor} value={valor}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="brand" size="sm" onClick={abrirNovo}>
          <Plus /> Novo veículo
        </Button>
      </PageHeading>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {listados.map((veiculo) => {
          const meta = STATUS_VEICULO[veiculo.status] || STATUS_VEICULO.disponivel;
          const qtd = interessados[veiculo.id] || 0;
          const gastos = totalGastos(veiculo);
          const tecnica = fichaTecnica(veiculo);
          return (
            <Card key={veiculo.id} className="group transition-shadow hover:shadow-lift">
              <CardContent className="flex flex-col gap-3 py-5">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className={CORES[meta.cor].pill}>
                    {meta.label}
                  </Badge>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => abrirEdicao(veiculo)}
                      aria-label={`Editar ${veiculo.nome}`}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => excluir(veiculo)}
                      aria-label={`Excluir ${veiculo.nome}`}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <div>
                  <strong className="font-display block text-[1.02rem] leading-snug font-bold tracking-tight">
                    {veiculo.nome}
                  </strong>
                  <span className="font-display mt-1 block text-xl font-extrabold text-brand-strong tabular-nums dark:text-brand">
                    {fmtBRL(veiculo.preco_centavos)}
                  </span>
                </div>

                {tecnica && <span className="text-[0.8rem] font-semibold text-muted-foreground">{tecnica}</span>}

                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[0.8rem] text-muted-foreground">
                  <span className="font-mono">{veiculo.placa || 'Sem placa'}</span>
                  <span>{anoCompleto(veiculo) || '—'}</span>
                  <span>{veiculo.cor || '—'}</span>
                  <span className="tabular-nums">{fmtKm(veiculo.km)}</span>
                </div>

                {gastos > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning/8 px-3 py-2 text-[0.78rem]">
                    <span className="font-semibold text-warning">
                      {fmtBRL(gastos)} em gastos ({percentualGastos(veiculo)}%)
                    </span>
                    <span className="text-muted-foreground">
                      Líquido <strong className="text-foreground tabular-nums">{fmtBRL(valorLiquido(veiculo))}</strong>
                    </span>
                  </div>
                )}

                {qtd > 0 && (
                  <span className="text-[0.78rem] font-semibold text-brand-strong dark:text-brand">
                    {qtd} ficha{qtd > 1 ? 's' : ''} vinculada{qtd > 1 ? 's' : ''}
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}

        {listados.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
            Nenhum veículo neste filtro.
          </p>
        )}
      </div>

      <Dialog open={Boolean(editando)} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-w-3xl">
          {editando && (
            <form onSubmit={salvar} className="flex flex-col gap-5">
              <DialogHeader>
                <DialogTitle>{editando.id ? 'Editar veículo' : 'Novo veículo'}</DialogTitle>
                <DialogDescription>Ficha técnica, situação e gastos lançados no veículo.</DialogDescription>
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
