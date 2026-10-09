import type { HTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-border bg-surface p-4', className)}
      {...rest}
    >
      {children}
    </div>
  )
}
