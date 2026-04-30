import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-white hover:bg-teal-800',
        variant === 'secondary' && 'border border-border bg-white text-ink hover:bg-surface',
        variant === 'danger' && 'bg-danger text-white hover:bg-red-800',
        variant === 'ghost' && 'text-muted hover:bg-surface hover:text-ink',
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';

