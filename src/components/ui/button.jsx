import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils.js';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all outline-none disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[1.15em] shrink-0 focus-visible:ring-[3px] focus-visible:ring-ring/45 focus-visible:border-ring",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:brightness-110 active:brightness-95',
        brand:
          'bg-gradient-to-br from-brand to-brand-strong text-white shadow-[0_10px_24px_-10px_var(--brand)] hover:shadow-[0_14px_30px_-10px_var(--brand)] hover:-translate-y-px active:translate-y-0',
        secondary:
          'bg-card text-foreground border border-border shadow-xs hover:bg-secondary',
        outline:
          'border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground',
        ghost: 'hover:bg-secondary hover:text-secondary-foreground',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:brightness-110',
        link: 'text-brand-strong underline-offset-4 hover:underline dark:text-brand',
      },
      size: {
        default: 'h-11 px-5 has-[>svg]:px-4',
        sm: 'h-9 rounded-md px-3.5 text-[0.82rem]',
        lg: 'h-13 rounded-xl px-7 text-base',
        icon: 'size-10 rounded-lg',
        'icon-sm': 'size-8 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
