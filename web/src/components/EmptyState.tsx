import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-10 text-center', className)}>
      {icon ? (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-muted">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-semibold text-text">{title}</p>
      {description ? <p className="max-w-xs text-sm text-muted">{description}</p> : null}
      {action}
    </div>
  )
}
