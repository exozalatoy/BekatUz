import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  padded?: boolean
}

export function Card({
  children,
  className,
  title,
  subtitle,
  action,
  padded = true,
}: CardProps) {
  const hasHeader = Boolean(title || subtitle || action)
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-white shadow-sm',
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-navy">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn(padded && 'p-5')}>{children}</div>
    </div>
  )
}
