import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button.jsx';
import { Card } from '@/components/ui/card.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { cn } from '@/lib/utils.js';

import { EsperaPill, PageHeading } from '../components/Pills.jsx';
import { CORES, STATUS_META, STATUS_OPTIONS, esperaInfo, fmtBRL, nomeDa, regiaoDa } from '../lib/format.js';

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
    Object.values(mapa).forEach((lista) => lista.sort((a, b) => esperaInfo(b).dias - esperaInfo(a).dias));
    return mapa;
  }, [fichas]);

  const alternar = (id) =>
    setSelecionadas((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  const soltar = async (event, status) => {
    event.preventDefault();
    setArrastandoSobre(null);
    const id = event.dataTransfer.getData('text/ficha-id');
    if (!id) return;
    const ficha = fichas.find((f) => f.id === id);
    if (!ficha || ficha.status === status) return;
    await onAtualizar(id, { status });
    api
      .addFollowup({ proposta_id: id, nota: null, status_anterior: ficha.status, status_novo: status })
      .catch(() => {});
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
    <div className="flex flex-col gap-6">
      <PageHeading
        titulo="Esteira de fichas"
        descricao="Arraste os cartões entre as colunas ou selecione várias fichas para mover em massa."
      />

      {selecionadas.length > 0 && (
        <Card className="flex flex-row flex-wrap items-center gap-3 border-brand/40 bg-accent/40 p-3.5">
          <strong className="text-[0.9rem]">
            {selecionadas.length} selecionada{selecionadas.length > 1 ? 's' : ''}
          </strong>
          <Select value={statusMassa} onValueChange={setStatusMassa}>
            <SelectTrigger size="sm" aria-label="Nova situação" className="w-[12rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="brand" size="sm" onClick={moverEmMassa} disabled={movendo}>
            {movendo ? 'Movendo...' : 'Mover fichas'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelecionadas([])}>
            Cancelar
          </Button>
        </Card>
      )}

      <div className="flex items-start gap-4 overflow-x-auto scrollbar-slim pb-2">
        {COLUNAS.map(({ status, meta }) => (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastandoSobre(status);
            }}
            onDragLeave={() => setArrastandoSobre(null)}
            onDrop={(e) => soltar(e, status)}
            className={cn(
              'flex w-[15.5rem] shrink-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-secondary/40 p-3 transition-colors',
              arrastandoSobre === status && 'border-brand bg-accent/60 ring-[3px] ring-brand/20',
            )}
          >
            <div className="flex items-center gap-2 px-1.5 py-1">
              <span className={cn('size-2.5 rounded-full', CORES[meta.cor].dot)} />
              <span className="flex-1 truncate text-[0.85rem] font-bold">{meta.label}</span>
              <b className="rounded-md bg-card px-2 py-0.5 text-[0.78rem] tabular-nums shadow-xs">
                {porColuna[status].length}
              </b>
            </div>

            <div className="flex max-h-[calc(100vh-19rem)] flex-col gap-2.5 overflow-y-auto scrollbar-slim">
              {porColuna[status].map((ficha) => {
                const marcada = selecionadas.includes(ficha.id);
                return (
                  <div
                    key={ficha.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/ficha-id', ficha.id)}
                    onClick={() => onAbrirFicha(ficha.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onAbrirFicha(ficha.id)}
                    className={cn(
                      'group relative cursor-grab rounded-xl border border-border bg-card p-3.5 pr-10 shadow-xs transition-all',
                      'hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-soft active:cursor-grabbing',
                      marcada && 'border-brand ring-[3px] ring-brand/20',
                    )}
                  >
                    <div
                      className="absolute top-3 right-3"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <Checkbox
                        className="size-4.5"
                        checked={marcada}
                        onCheckedChange={() => alternar(ficha.id)}
                        aria-label={marcada ? 'Desmarcar ficha' : 'Selecionar ficha'}
                      />
                    </div>

                    <strong className="block truncate text-[0.92rem] font-semibold">{nomeDa(ficha)}</strong>
                    <small className="mt-0.5 block truncate text-[0.78rem] text-muted-foreground">
                      {ficha.veiculo ? ficha.veiculo.nome : 'Sem carro vinculado'}
                    </small>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.75rem] text-muted-foreground">
                      <EsperaPill ficha={ficha} />
                      {ficha.valor_venda_centavos ? (
                        <span className="font-semibold tabular-nums">{fmtBRL(ficha.valor_venda_centavos)}</span>
                      ) : null}
                      <span className="truncate">{regiaoDa(ficha) || '—'}</span>
                    </div>
                  </div>
                );
              })}

              {porColuna[status].length === 0 && (
                <div className="rounded-xl border border-dashed border-border py-8 text-center text-[0.8rem] text-muted-foreground">
                  Vazio
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
