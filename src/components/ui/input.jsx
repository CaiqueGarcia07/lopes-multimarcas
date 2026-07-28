import { cn } from '@/lib/utils.js';

function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3.5 py-2 text-[0.95rem] text-foreground shadow-xs transition-[color,box-shadow,border-color] outline-none',
        'placeholder:text-muted-foreground/70 selection:bg-brand/25',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/25 aria-invalid:focus-visible:ring-destructive/30',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
