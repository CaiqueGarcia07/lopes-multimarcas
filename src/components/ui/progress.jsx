import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '@/lib/utils.js';

function Progress({ className, value = 0, ...props }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-secondary', className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 rounded-full bg-gradient-to-r from-brand to-brand-strong transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
