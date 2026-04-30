import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-teal-100',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';

