import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Junta classes condicionais resolvendo conflitos do Tailwind (padrão shadcn/ui). */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
