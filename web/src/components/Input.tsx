import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../lib/utils'

export interface InputProps extends ComponentProps<'input'> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightSlot?: ReactNode
}

export function Input({ label, error, hint, leftIcon, rightSlot, className, ...rest }: InputProps) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span> : null}
      <span
        className={cn(
          'flex items-center gap-2 rounded-btn border bg-surface-2 px-3.5 transition focus-within:border-accent',
          error ? 'border-danger' : 'border-border',
        )}
      >
        {leftIcon ? <span className="shrink-0 text-muted">{leftIcon}</span> : null}
        <input
          className={cn(
            'h-12 w-full min-w-0 bg-transparent text-[15px] text-text outline-none',
            className,
          )}
          {...rest}
        />
        {rightSlot ? <span className="shrink-0">{rightSlot}</span> : null}
      </span>
      {error ? (
        <span className="mt-1.5 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  )
}
