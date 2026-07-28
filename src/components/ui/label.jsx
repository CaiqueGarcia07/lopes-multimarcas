import * as LabelPrimitive from '@radix-ui/react-label';

import { cn } from '@/lib/utils.js';

function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-1.5 text-[0.78rem] font-bold tracking-wide text-muted-foreground select-none',
        'group-data-[disabled=true]:opacity-60 peer-disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
