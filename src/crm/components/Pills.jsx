import { Badge } from '@/components/ui/badge.jsx';
import { cn } from '@/lib/utils.js';

import { ESPERA_CLASSES, STATUS_META, corDoStatus, esperaInfo } from '../lib/format.js';

/** Etiqueta colorida da situação da ficha no funil. */
export function StatusPill({ status, className }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn(corDoStatus(status).pill, className)}>
      {meta?.label || status}
    </Badge>
  );
}

/** Tempo desde a última movimentação — verde, âmbar ou vermelho. */
export function EsperaPill({ ficha, sufixo, icone: Icone, className }) {
  const espera = esperaInfo(ficha);
  return (
    <Badge variant="outline" className={cn(ESPERA_CLASSES[espera.nivel], className)}>
      {Icone && <Icone />}
      {espera.label}
      {sufixo ? ` ${sufixo}` : ''}
    </Badge>
  );
}

/** Cabeçalho padrão das páginas do CRM. */
export function PageHeading({ titulo, descricao, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[1.75rem] leading-tight font-extrabold tracking-tight">{titulo}</h1>
        {descricao && <p className="mt-1.5 text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  );
}
