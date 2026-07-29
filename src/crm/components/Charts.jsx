import { cn } from '@/lib/utils.js';

/*
  Gráficos em CSS puro — sem biblioteca, para não pesar o bundle.
  Cada gráfico usa UMA cor: a identidade vem dos rótulos dos eixos, não da cor,
  então não há risco de confusão para daltônicos. As cores saem dos tokens do
  tema e trocam sozinhas entre claro e escuro.
*/

/** Tabela equivalente ao gráfico, para leitores de tela. */
function TabelaOculta({ titulo, dados, formatar }) {
  return (
    <table className="sr-only">
      <caption>{titulo}</caption>
      <tbody>
        {dados.map((item) => (
          <tr key={item.rotulo}>
            <th scope="row">{item.rotuloCompleto || item.rotulo}</th>
            <td>{formatar(item.valor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tooltip({ children }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-background shadow-md group-hover:block group-focus-visible:block">
      {children}
    </span>
  );
}

/**
 * Barras verticais para série ao longo do tempo.
 * `dados`: [{ rotulo, valor, rotuloCompleto? }]
 */
export function BarrasVerticais({ titulo, dados, cor = 'var(--brand-strong)', formatar = String, vazio }) {
  const maximo = Math.max(1, ...dados.map((d) => d.valor));
  const temDados = dados.some((d) => d.valor > 0);

  if (!temDados) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{vazio}</p>;
  }

  return (
    <figure className="m-0">
      <TabelaOculta titulo={titulo} dados={dados} formatar={formatar} />
      <div className="flex h-44 items-end gap-2" aria-hidden="true">
        {dados.map((item) => (
          <div key={item.rotulo} className="group relative flex h-full flex-1 flex-col justify-end gap-2">
            <Tooltip>
              {item.rotuloCompleto || item.rotulo}: {formatar(item.valor)}
            </Tooltip>
            <span className="text-center font-display text-[0.82rem] font-bold tabular-nums">
              {item.valor > 0 ? formatar(item.valor) : ''}
            </span>
            <span
              className="mx-auto w-full max-w-11 rounded-t-[4px] transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max((item.valor / maximo) * 100, item.valor > 0 ? 4 : 0)}%`, background: cor }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t border-border pt-2" aria-hidden="true">
        {dados.map((item) => (
          <span key={item.rotulo} className="flex-1 text-center text-[0.72rem] font-semibold text-muted-foreground">
            {item.rotulo}
          </span>
        ))}
      </div>
    </figure>
  );
}

/**
 * Barras horizontais para comparar categorias — rótulos longos cabem melhor
 * na horizontal do que girados na vertical.
 */
export function BarrasHorizontais({ titulo, dados, cor = 'var(--brand-strong)', formatar = String, vazio }) {
  const maximo = Math.max(1, ...dados.map((d) => d.valor));
  const temDados = dados.some((d) => d.valor > 0);

  if (!temDados) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{vazio}</p>;
  }

  return (
    <figure className="m-0 flex flex-col gap-2.5">
      <TabelaOculta titulo={titulo} dados={dados} formatar={formatar} />
      {dados.map((item) => (
        <div
          key={item.rotulo}
          className="group relative grid grid-cols-[minmax(6rem,9.5rem)_minmax(0,1fr)_auto] items-center gap-3"
          aria-hidden="true"
        >
          <span className="truncate text-[0.82rem] font-semibold text-muted-foreground" title={item.rotulo}>
            {item.rotulo}
          </span>
          <span className="relative h-3 rounded-full bg-secondary">
            <Tooltip>
              {item.rotuloCompleto || item.rotulo}: {formatar(item.valor)}
            </Tooltip>
            <span
              className="block h-full rounded-r-[4px] rounded-l-full transition-opacity group-hover:opacity-80"
              style={{ width: `${Math.max((item.valor / maximo) * 100, item.valor > 0 ? 2 : 0)}%`, background: cor }}
            />
          </span>
          <span className="text-right font-display text-[0.85rem] font-bold tabular-nums">{formatar(item.valor)}</span>
        </div>
      ))}
    </figure>
  );
}

/** Número de destaque acima de um gráfico. */
export function Destaque({ valor, rotulo, className }) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <strong className="font-display text-3xl leading-none tracking-tight tabular-nums">{valor}</strong>
      <span className="text-[0.78rem] text-muted-foreground">{rotulo}</span>
    </div>
  );
}
