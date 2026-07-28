import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils.js';

const alertVariants = cva(
  'relative w-full rounded-xl border px-4 py-3.5 text-sm grid grid-cols-[0_1fr] has-[>svg]:grid-cols-[1.25rem_1fr] gap-x-3 items-start [&>svg]:size-5 [&>svg]:translate-y-0.5',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground border-border',
        info: 'bg-accent/60 text-accent-foreground border-brand/25 [&>svg]:text-brand-strong dark:[&>svg]:text-brand',
        success: 'bg-success/10 text-success border-success/25',
        warning: 'bg-warning/10 text-warning border-warning/25',
        destructive: 'bg-destructive/10 text-destructive border-destructive/25',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Alert({ className, variant, ...props }) {
  return (
    <div data-slot="alert" role="status" className={cn(alertVariants({ variant }), className)} {...props} />
  );
}

function AlertTitle({ className, ...props }) {
  return (
    <div
      data-slot="alert-title"
      className={cn('col-start-2 min-h-4 font-bold tracking-tight', className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }) {
  return (
    <div
      data-slot="alert-description"
      className={cn('col-start-2 grid justify-items-start gap-1 text-sm leading-relaxed opacity-90', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
