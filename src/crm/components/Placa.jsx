import { cn } from '@/lib/utils.js';

/**
 * Placa no padrão Mercosul. No pátio o carro é chamado pela placa, então ela
 * é o identificador visual do veículo em todo o CRM.
 */
export function Placa({ placa, className }) {
  if (!placa) return <span className="text-[0.8rem] text-muted-foreground">Sem placa</span>;
  return (
    <span
      className={cn(
        'inline-flex w-[5.6rem] shrink-0 flex-col overflow-hidden rounded-[5px] border-[1.5px] border-[#1f191b] bg-white align-middle dark:border-white/70',
        className,
      )}
      aria-label={`Placa ${placa}`}
    >
      <span aria-hidden="true" className="bg-[#1a3e9c] px-1.5 text-[0.55rem] leading-[0.8rem] font-semibold tracking-wide text-white">
        BRASIL
      </span>
      <span className="text-center font-display text-[0.92rem] leading-[1.35rem] font-bold tracking-[0.04em] text-[#1f191b] tabular-nums">
        {placa}
      </span>
    </span>
  );
}
