import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
  leftIcon?: ReactNode
  hint?: string
}

export function Input({
  label,
  error,
  leftIcon,
  hint,
  className,
  id,
  ...props
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-navy"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'h-10 w-full rounded-lg border bg-white text-sm text-navy',
            'placeholder:text-muted/70',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            'disabled:cursor-not-allowed disabled:bg-surface',
            leftIcon ? 'pl-10 pr-3' : 'px-3',
            error ? 'border-danger' : 'border-line',
            className,
          )}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
