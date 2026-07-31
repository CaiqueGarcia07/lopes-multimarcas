import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils.js';

function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors outline-none',
        'bg-input data-[state=checked]:bg-brand-strong dark:data-[state=checked]:bg-brand',
        'focus-visible:ring-[3px] focus-visible:ring-ring/35',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform',
          'translate-x-0.5 data-[state=checked]:translate-x-[1.15rem]',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
