import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';

import { cn } from '@/lib/utils.js';

function RadioGroup({ className, ...props }) {
  return (
    <RadioGroupPrimitive.Root data-slot="radio-group" className={cn('grid gap-3', className)} {...props} />
  );
}

function RadioGroupItem({ className, ...props }) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'aspect-square size-5 shrink-0 rounded-full border border-input bg-card text-brand-strong shadow-xs transition-[color,box-shadow,border-color] outline-none',
        'data-[state=checked]:border-brand-strong dark:text-brand dark:data-[state=checked]:border-brand',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <Circle className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 fill-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

/** Opção em formato de cartão clicável — usada nas escolhas Sim/Não do formulário. */
function RadioCard({ value, id, children, className }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'group relative flex flex-1 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-[0.95rem] font-semibold shadow-xs transition-all',
        'hover:border-brand/50 hover:bg-accent/40',
        'has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-accent/70 has-[[data-state=checked]]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_18%,transparent)]',
        className,
      )}
    >
      <RadioGroupItem value={value} id={id} />
      <span>{children}</span>
    </label>
  );
}

export { RadioGroup, RadioGroupItem, RadioCard };
