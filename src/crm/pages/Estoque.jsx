import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea.jsx';

import { maskCurrency, onlyDigits } from '../../utils/form.js';
import { PageHeading } from '../components/Pills.jsx';
import { CORES, fmtBRL, fmtKm } from '../lib/format.js';

const STATUS_VEICULO = {
  disponivel: { label: 'Disponível', cor: 'green' },
  reservado: { label: 'Reservado', cor: 'amber' },
  vendido: { label: 'Vendido', cor: 'gray' },
};

const TODOS = '__todos__';

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

  const abrirNovo = () => {
    setErro('');
    setEditando({ ...vazio });
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
      ano_modelo: veiculo.ano_modelo || '',
      status: veiculo.status,
      observacoes: veiculo.observacoes || '',
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

  const campo = (chave, mascara) => (event) =>
    setEditando((atual) => ({
      ...atual,
      [chave]: mascara ? maskCurrency(event.target.value) : event.target.value,
    }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        titulo="Estoque de carros"
        descricao={`${veiculos.length} veículo${veiculos.length === 1 ? '' : 's'} · importado do controle da loja`}
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

                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[0.8rem] text-muted-foreground">
                  <span className="font-mono">{veiculo.placa || 'Sem placa'}</span>
                  <span>{veiculo.ano_modelo || '—'}</span>
                  <span>{veiculo.cor || '—'}</span>
                  <span className="tabular-nums">{fmtKm(veiculo.km)}</span>
                </div>

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
        <DialogContent className="max-w-2xl">
          {editando && (
            <form onSubmit={salvar} className="flex flex-col gap-5">
              <DialogHeader>
                <DialogTitle>{editando.id ? 'Editar veículo' : 'Novo veículo'}</DialogTitle>
                <DialogDescription>Dados usados nas fichas e no funil de vendas.</DialogDescription>
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
                  <Label htmlFor="veiculo-ano">Ano do modelo</Label>
                  <Input id="veiculo-ano" value={editando.ano_modelo} onChange={campo('ano_modelo')} placeholder="2024/2025" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="veiculo-status">Situação</Label>
                  <Select
                    value={editando.status}
                    onValueChange={(valor) => setEditando((atual) => ({ ...atual, status: valor }))}
                  >
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
