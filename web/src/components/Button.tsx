import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:brightness-110 shadow-[0_8px_24px_rgba(47,107,255,0.35)]',
  secondary: 'bg-surface-2 text-text border border-border hover:bg-surface',
  outline: 'bg-transparent text-text border border-border hover:bg-surface-2',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-surface-2',
  danger: 'bg-danger text-white hover:brightness-110',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-btn gap-1.5',
  md: 'h-11 px-4 text-sm rounded-btn gap-2',
  lg: 'h-13 px-5 text-base rounded-btn gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={18} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
