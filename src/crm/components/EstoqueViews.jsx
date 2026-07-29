import { CarFront, Images, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { cn } from '@/lib/utils.js';

import { CORES, fmtBRL, fmtKm } from '../lib/format.js';
import { anoCompleto, capaDe, fichaTecnica, fotosDe, percentualGastos, totalGastos, valorLiquido } from '../lib/veiculo.js';

export const STATUS_VEICULO = {
  disponivel: { label: 'Disponível', cor: 'green' },
  reservado: { label: 'Reservado', cor: 'amber' },
  vendido: { label: 'Vendido', cor: 'gray' },
};

const metaDe = (veiculo) => STATUS_VEICULO[veiculo.status] || STATUS_VEICULO.disponivel;

/** Capa do veículo; sem foto cadastrada mostra um marcador neutro. */
function Capa({ veiculo, url, className }) {
  const path = capaDe(veiculo);
  const quantidade = fotosDe(veiculo).length;
  const src = path ? url(path) : null;

  return (
    <div className={cn('relative overflow-hidden bg-secondary', className)}>
      {src ? (
        <img
          src={src}
          alt={veiculo.nome}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground/40">
          <CarFront className="size-1/3 max-h-16" aria-hidden="true" />
        </div>
      )}
      {quantidade > 1 && (
        <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-[#0b0f14]/75 px-1.5 py-0.5 text-[0.7rem] font-bold text-white">
          <Images className="size-3" /> {quantidade}
        </span>
      )}
    </div>
  );
}

function Acoes({ veiculo, onEditar, onExcluir, sempreVisivel = false }) {
  return (
    <div
      className={cn(
        'flex gap-1 transition-opacity',
        sempreVisivel ? '' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
      )}
    >
      <Button variant="ghost" size="icon-sm" onClick={() => onEditar(veiculo)} aria-label={`Editar ${veiculo.nome}`}>
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onExcluir(veiculo)}
        aria-label={`Excluir ${veiculo.nome}`}
        className="text-destructive hover:bg-destructive/10"
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function LinhaGastos({ veiculo }) {
  const gastos = totalGastos(veiculo);
  if (gastos <= 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning/8 px-3 py-2 text-[0.78rem]">
      <span className="font-semibold text-warning">
        {fmtBRL(gastos)} em gastos ({percentualGastos(veiculo)}%)
      </span>
      <span className="text-muted-foreground">
        Líquido <strong className="text-foreground tabular-nums">{fmtBRL(valorLiquido(veiculo))}</strong>
      </span>
    </div>
  );
}

/** Galeria: foco na foto do carro, para reconhecer o veículo de relance. */
export function VisaoGaleria({ veiculos, fichasPorVeiculo, url, onEditar, onExcluir }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {veiculos.map((veiculo) => {
        const meta = metaDe(veiculo);
        const qtd = fichasPorVeiculo[veiculo.id] || 0;
        return (
          <Card key={veiculo.id} className="group overflow-hidden transition-shadow hover:shadow-lift">
            <div className="relative">
              <Capa veiculo={veiculo} url={url} className="aspect-[4/3]" />
              <div className="absolute top-3 left-3">
                <Badge variant="outline" className={cn(CORES[meta.cor].pill, 'bg-card/90 backdrop-blur-[2px]')}>
                  {meta.label}
                </Badge>
              </div>
              <div className="absolute top-2 right-2 rounded-lg bg-card/90 p-0.5">
                <Acoes veiculo={veiculo} onEditar={onEditar} onExcluir={onExcluir} />
              </div>
            </div>

            <CardContent className="flex flex-col gap-2.5 px-5 py-4">
              <div>
                <strong className="font-display block line-clamp-2 text-[0.98rem] leading-snug font-bold tracking-tight">
                  {veiculo.nome}
                </strong>
                <span className="font-display mt-1 block text-xl font-extrabold text-brand-strong tabular-nums dark:text-brand">
                  {fmtBRL(veiculo.preco_centavos)}
                </span>
              </div>

              <span className="text-[0.78rem] font-semibold text-muted-foreground">
                {fichaTecnica(veiculo) || 'Ficha técnica não preenchida'}
              </span>

              <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-2.5 text-[0.76rem] text-muted-foreground">
                <span className="font-mono">{veiculo.placa || 'Sem placa'}</span>
                <span>{veiculo.cor || '—'}</span>
                <span className="tabular-nums">{fmtKm(veiculo.km)}</span>
              </div>

              <LinhaGastos veiculo={veiculo} />

              {qtd > 0 && (
                <span className="text-[0.76rem] font-semibold text-brand-strong dark:text-brand">
                  {qtd} ficha{qtd > 1 ? 's' : ''} vinculada{qtd > 1 ? 's' : ''}
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** Grade: sem foto, densidade maior — bom para conferir dados. */
export function VisaoGrade({ veiculos, fichasPorVeiculo, onEditar, onExcluir }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {veiculos.map((veiculo) => {
        const meta = metaDe(veiculo);
        const qtd = fichasPorVeiculo[veiculo.id] || 0;
        return (
          <Card key={veiculo.id} className="group transition-shadow hover:shadow-lift">
            <CardContent className="flex flex-col gap-3 py-5">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline" className={CORES[meta.cor].pill}>
                  {meta.label}
                </Badge>
                <Acoes veiculo={veiculo} onEditar={onEditar} onExcluir={onExcluir} />
              </div>

              <div>
                <strong className="font-display block text-[1.02rem] leading-snug font-bold tracking-tight">
                  {veiculo.nome}
                </strong>
                <span className="font-display mt-1 block text-xl font-extrabold text-brand-strong tabular-nums dark:text-brand">
                  {fmtBRL(veiculo.preco_centavos)}
                </span>
              </div>

              {fichaTecnica(veiculo) && (
                <span className="text-[0.8rem] font-semibold text-muted-foreground">{fichaTecnica(veiculo)}</span>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[0.8rem] text-muted-foreground">
                <span className="font-mono">{veiculo.placa || 'Sem placa'}</span>
                <span>{anoCompleto(veiculo) || '—'}</span>
                <span>{veiculo.cor || '—'}</span>
                <span className="tabular-nums">{fmtKm(veiculo.km)}</span>
              </div>

              <LinhaGastos veiculo={veiculo} />

              {qtd > 0 && (
                <span className="text-[0.78rem] font-semibold text-brand-strong dark:text-brand">
                  {qtd} ficha{qtd > 1 ? 's' : ''} vinculada{qtd > 1 ? 's' : ''}
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** Lista: uma linha por carro, para comparar preço, gasto e margem. */
export function VisaoLista({ veiculos, fichasPorVeiculo, url, onEditar, onExcluir }) {
  return (
    <Card className="overflow-hidden">
      <Table className="min-w-[64rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Veículo</TableHead>
            <TableHead>Placa</TableHead>
            <TableHead>Ano</TableHead>
            <TableHead className="text-right">KM</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-right">Gastos</TableHead>
            <TableHead className="text-right">Líquido</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {veiculos.map((veiculo) => {
            const meta = metaDe(veiculo);
            const gastos = totalGastos(veiculo);
            const qtd = fichasPorVeiculo[veiculo.id] || 0;
            return (
              <TableRow key={veiculo.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Capa veiculo={veiculo} url={url} className="size-12 shrink-0 rounded-lg" />
                    <div className="min-w-0">
                      <strong className="block truncate font-semibold">{veiculo.nome}</strong>
                      <small className="text-muted-foreground">
                        {[fichaTecnica(veiculo), qtd > 0 && `${qtd} ficha${qtd > 1 ? 's' : ''}`]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </small>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-[0.82rem]">{veiculo.placa || '—'}</TableCell>
                <TableCell className="whitespace-nowrap">{anoCompleto(veiculo) || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtKm(veiculo.km)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{fmtBRL(veiculo.preco_centavos)}</TableCell>
                <TableCell className={cn('text-right tabular-nums', gastos > 0 ? 'text-warning' : 'text-muted-foreground')}>
                  {gastos > 0 ? fmtBRL(gastos) : '—'}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{fmtBRL(valorLiquido(veiculo))}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={CORES[meta.cor].pill}>
                    {meta.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Acoes veiculo={veiculo} onEditar={onEditar} onExcluir={onExcluir} sempreVisivel />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
